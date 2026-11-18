from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.auth import hash_password, require_approved_student, verify_password
from app.db import Base, get_db
from app.main import app
from app.models import AuthSession, Document, Lesson, User


@pytest.fixture
def client(monkeypatch):
    # Startup imports bundled documents in production; unit tests use only fixture DBs.
    monkeypatch.setattr("app.main.ingest_documents", lambda: None)
    from app.ai_chat import ai_settings

    monkeypatch.setattr(ai_settings, "api_key", "")
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        session.add_all(
            [
                Lesson(
                    group_name="ИС-1",
                    date=date(2026, 11, 17),
                    starts_at="09:00",
                    ends_at="10:30",
                    subject="Python",
                    teacher="Преподаватель",
                    room="101",
                ),
                Lesson(
                    group_name="ИС-2",
                    date=date(2026, 11, 17),
                    starts_at="09:00",
                    ends_at="10:30",
                    subject="Другая группа",
                    teacher="Преподаватель",
                    room="102",
                ),
                Lesson(
                    group_name="ИС-1",
                    date=date(2026, 11, 18),
                    starts_at="09:00",
                    ends_at="10:30",
                    subject="Другой день",
                    teacher="Преподаватель",
                    room="101",
                ),
            ]
        )
        session.commit()
        app.dependency_overrides[get_db] = lambda: session
        app.dependency_overrides[require_approved_student] = lambda: None
        try:
            with TestClient(app) as test_client:
                yield test_client
        finally:
            app.dependency_overrides.clear()
    engine.dispose()


def test_schedule_filters_group_and_day(client):
    response = client.get(
        "/api/v1/schedule", params={"group": "ИС-1", "day": "2026-11-17"}
    )
    assert response.status_code == 200
    assert [item["subject"] for item in response.json()] == ["Python"]


def test_guest_cannot_access_content(client):
    del app.dependency_overrides[require_approved_student]
    for path in (
        "/api/v1/documents",
        "/api/v1/applications",
        "/api/v1/schedule?group=ИС-1&day=2026-11-17",
    ):
        assert client.get(path).status_code == 401
    assert client.post("/api/v1/chat", json={"message": "Привет"}).status_code == 401


def test_schedule_validates_date(client):
    assert (
        client.get(
            "/api/v1/schedule", params={"group": "ИС-1", "day": "bad-date"}
        ).status_code
        == 422
    )


def test_health_reports_database_failure(client):
    class BrokenSession:
        def execute(self, statement):
            raise OperationalError("SELECT 1", {}, Exception("unavailable"))

    app.dependency_overrides[get_db] = lambda: BrokenSession()
    assert client.get("/api/v1/health").status_code == 503


def test_unconfigured_chat_does_not_fabricate_answers(client):
    assert (
        client.post("/api/v1/chat", json={"message": "Где библиотека?"}).status_code
        == 503
    )
    assert client.post("/api/v1/chat", json={"message": ""}).status_code == 422


def student_payload(**overrides):
    return {
        "email": "student@example.com",
        "password": "Student-test-123",
        "first_name": "Иван",
        "last_name": "Иванов",
        "group_name": "ИС-1",
        **overrides,
    }


def test_registration_login_session_logout(client):
    del app.dependency_overrides[require_approved_student]
    response = client.post(
        "/api/v1/auth/register", json=student_payload(email=" Student@EXAMPLE.com ")
    )
    assert response.status_code == 201
    assert response.json()["email"] == "student@example.com"
    assert response.json()["role"] == "student"
    assert "password" not in response.json() and "password_hash" not in response.json()
    db = app.dependency_overrides[get_db]()
    assert db.scalar(select(User)).password_hash != student_payload()["password"]
    assert (
        client.post(
            "/api/v1/auth/login",
            json={"email": "student@example.com", "password": "wrong"},
        ).status_code
        == 401
    )
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "STUDENT@example.com", "password": student_payload()["password"]},
    )
    assert response.status_code == 200
    assert "httponly" in response.headers["set-cookie"].lower()
    assert "samesite=strict" in response.headers["set-cookie"].lower()
    cookie = client.cookies.get("intc_session")
    assert client.get("/api/v1/auth/me").json()["group_name"] == "ИС-1"
    assert client.get("/api/v1/documents").status_code == 200
    assert client.post("/api/v1/auth/logout").status_code == 204
    client.cookies.set("intc_session", cookie)
    assert client.get("/api/v1/auth/me").status_code == 401


def test_registration_validation_and_privilege_escalation(client):
    for changes in (
        {"role": "admin"},
        {"status": "approved"},
        {"group_name": " "},
        {"email": "bad"},
        {"password": "short"},
    ):
        assert (
            client.post(
                "/api/v1/auth/register", json=student_payload(**changes)
            ).status_code
            == 422
        )
    assert client.post("/api/v1/auth/register", json=student_payload()).status_code == 201
    assert (
        client.post(
            "/api/v1/auth/register", json=student_payload(email="STUDENT@example.com")
        ).status_code
        == 409
    )


def test_user_updates_profile_without_changing_role(client):
    del app.dependency_overrides[require_approved_student]
    assert client.post("/api/v1/auth/register", json=student_payload()).status_code == 201
    assert (
        client.post(
            "/api/v1/auth/login",
            json={"email": "student@example.com", "password": "Student-test-123"},
        ).status_code
        == 200
    )
    payload = {
        "email": " Updated@Example.com ",
        "first_name": " Айдос ",
        "last_name": " Садыков ",
        "group_name": "тис 24р",
        "current_password": "Student-test-123",
        "new_password": "Updated-test-456",
    }
    response = client.put("/api/v1/auth/me", json=payload)
    assert response.status_code == 200
    assert response.json() == {
        "id": response.json()["id"],
        "first_name": "Айдос",
        "last_name": "Садыков",
        "email": "updated@example.com",
        "status": "approved",
        "role": "student",
        "group_name": "ТИС-24Р",
    }
    user = app.dependency_overrides[get_db]().scalar(select(User))
    assert user.role == "student"
    assert verify_password("Updated-test-456", user.password_hash)
    assert not verify_password("Student-test-123", user.password_hash)


def test_profile_update_rejects_privilege_fields_and_wrong_password(client):
    del app.dependency_overrides[require_approved_student]
    client.post("/api/v1/auth/register", json=student_payload())
    client.post(
        "/api/v1/auth/login",
        json={"email": "student@example.com", "password": "Student-test-123"},
    )
    payload = {
        "email": "student@example.com",
        "first_name": "Иван",
        "last_name": "Иванов",
        "group_name": "ИС-1",
    }
    assert (
        client.put("/api/v1/auth/me", json={**payload, "role": "admin"}).status_code
        == 422
    )
    assert (
        client.put("/api/v1/auth/me", json={**payload, "status": "approved"}).status_code
        == 422
    )
    assert (
        client.put(
            "/api/v1/auth/me",
            json={
                **payload,
                "current_password": "wrong",
                "new_password": "Updated-test-456",
            },
        ).status_code
        == 400
    )
    assert app.dependency_overrides[get_db]().scalar(select(User)).role == "student"


def test_blocked_and_expired_sessions(client):
    del app.dependency_overrides[require_approved_student]
    client.post("/api/v1/auth/register", json=student_payload())
    credentials = {
        "email": "student@example.com",
        "password": student_payload()["password"],
    }
    client.post("/api/v1/auth/login", json=credentials)
    db = app.dependency_overrides[get_db]()
    user = db.scalar(select(User))
    user.status = "blocked"
    db.commit()
    assert client.get("/api/v1/documents").status_code == 403
    assert client.post("/api/v1/auth/login", json=credentials).status_code == 403
    user.status = "approved"
    db.scalar(select(AuthSession)).expires_at = 0
    db.commit()
    assert client.get("/api/v1/auth/me").status_code == 401
    assert client.get("/api/v1/documents").status_code == 401


def test_admin_login_without_group_and_cross_origin_rejected(client):
    db = app.dependency_overrides[get_db]()
    db.add(
        User(
            email="admin@example.com",
            first_name="Администратор",
            last_name="Портала",
            role="admin",
            status="approved",
            password_hash=hash_password("Admin-test-123"),
        )
    )
    db.commit()
    credentials = {"email": "admin@example.com", "password": "Admin-test-123"}
    assert (
        client.post(
            "/api/v1/auth/login",
            json=credentials,
            headers={"Origin": "https://evil.example"},
        ).status_code
        == 403
    )
    response = client.post("/api/v1/auth/login", json=credentials)
    assert response.status_code == 200
    assert response.json()["role"] == "admin"
    assert "group_name" not in response.json()
    assert client.get("/api/v1/auth/me").json()["role"] == "admin"


def login_schedule_admin(client):
    del app.dependency_overrides[require_approved_student]
    db = app.dependency_overrides[get_db]()
    db.add(
        User(
            email="schedule-admin@example.com",
            first_name="Админ",
            last_name="Расписания",
            role="admin",
            status="approved",
            password_hash=hash_password("Admin-test-123"),
        )
    )
    db.commit()
    client.post(
        "/api/v1/auth/login",
        json={
            "email": "schedule-admin@example.com",
            "password": "Admin-test-123",
        },
    )


def schedule_payload():
    return {
        "lessons": [
            {
                "starts_at": "08:00",
                "ends_at": "09:20",
                "subject": " Математика ",
                "teacher": "Преподаватель",
                "room": "606",
            }
        ]
    }


def test_admin_publishes_replaces_and_clears_selected_day(client):
    login_schedule_admin(client)
    url = "/api/v1/schedule?group=ИС-1&day=2026-11-17"
    response = client.put(url, json=schedule_payload())
    assert response.status_code == 200
    assert [row["subject"] for row in client.get(url).json()] == ["Математика"]
    assert (
        client.get("/api/v1/schedule?group=ИС-2&day=2026-11-17").json()[0]["subject"]
        == "Другая группа"
    )
    assert (
        client.get("/api/v1/schedule?group=ИС-1&day=2026-11-18").json()[0]["subject"]
        == "Другой день"
    )
    assert len(client.put(url, json=schedule_payload()).json()) == 1
    assert client.put(url, json={"lessons": []}).status_code == 200
    assert client.get(url).json() == []


def test_schedule_write_rejects_guest_other_group_blocked_admin_and_cross_origin(
    client,
):
    del app.dependency_overrides[require_approved_student]
    url = "/api/v1/schedule?group=ИС-1&day=2026-11-17"
    assert client.put(url, json=schedule_payload()).status_code == 401
    client.post("/api/v1/auth/register", json=student_payload())
    client.post(
        "/api/v1/auth/login",
        json={
            "email": "student@example.com",
            "password": student_payload()["password"],
        },
    )
    other_group = "/api/v1/schedule?group=ИС-2&day=2026-11-17"
    assert client.put(other_group, json=schedule_payload()).status_code == 403
    # A student may publish for their own group (any spelling of the group name).
    assert (
        client.put(
            "/api/v1/schedule?group=ис 1&day=2026-11-17", json=schedule_payload()
        ).status_code
        == 200
    )
    app.dependency_overrides[require_approved_student] = lambda: None
    login_schedule_admin(client)
    assert (
        client.put(
            url, json=schedule_payload(), headers={"Origin": "https://evil.example"}
        ).status_code
        == 403
    )
    db = app.dependency_overrides[get_db]()
    db.scalar(select(User).where(User.role == "admin")).status = "blocked"
    db.commit()
    assert client.put(url, json=schedule_payload()).status_code == 403


def test_schedule_rejects_invalid_rows_without_erasing_published_data(client):
    login_schedule_admin(client)
    url = "/api/v1/schedule?group=ИС-1&day=2026-11-17"
    for changes in (
        {"starts_at": "25:00"},
        {"ends_at": "07:00"},
        {"subject": " "},
        {"teacher": ""},
        {"room": "x" * 51},
    ):
        payload = schedule_payload()
        payload["lessons"][0].update(changes)
        assert client.put(url, json=payload).status_code == 422
    payload = schedule_payload()
    payload["lessons"].append(dict(payload["lessons"][0]))
    assert client.put(url, json=payload).status_code == 422
    assert client.get(url).json()[0]["subject"] == "Python"


def test_chat_stream_route_uses_knowledge_and_returns_chunks(client, monkeypatch):
    from app import ai_chat

    monkeypatch.setattr(ai_chat.ai_settings, "api_key", "test-only")
    monkeypatch.setattr(
        ai_chat, "load_knowledge", lambda db: "Колледж находится в Алматы."
    )

    def answer(prompt, question, language="ru"):
        assert "Колледж находится в Алматы." in prompt
        assert question == "Где колледж?"
        yield "В "
        yield "Алматы."

    monkeypatch.setattr(ai_chat, "stream_answer", answer)
    response = client.post("/api/v1/chat", json={"message": "Где колледж?"})
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/plain")
    assert response.text == "В Алматы."
    assert sum(route.path == "/api/v1/chat" for route in app.routes) == 1


def test_chat_knowledge_reads_pdf_bytes_from_database(client, monkeypatch, tmp_path):
    from app import ai_chat

    db = app.dependency_overrides[get_db]()
    document = Document(
        title="Правила колледжа",
        category="Документы",
        url="/api/v1/documents/1/file",
        description="",
        file_name="rules.pdf",
        file_data=b"database-pdf",
    )
    db.add(document)
    db.commit()
    ai_chat._cache.clear()
    monkeypatch.setattr(ai_chat, "KNOWLEDGE_DIR", tmp_path)
    monkeypatch.setattr(
        ai_chat,
        "pdf_to_text",
        lambda data: "В колледже действует кодекс чести."
        if data == b"database-pdf"
        else "",
    )

    knowledge = ai_chat.load_knowledge(db)

    assert "Правила колледжа" in knowledge
    assert "В колледже действует кодекс чести." in knowledge


def test_chat_knowledge_falls_back_when_database_pdf_is_unreadable(
    client, monkeypatch, tmp_path
):
    from app import ai_chat

    db = app.dependency_overrides[get_db]()
    db.add(
        Document(
            title="Скан",
            category="Документы",
            url="/api/v1/documents/1/file",
            description="",
            file_name="scan.pdf",
            file_data=b"unreadable-scan",
        )
    )
    db.commit()
    fallback = tmp_path / "college.pdf"
    fallback.write_bytes(b"bundled-pdf")
    ai_chat._cache.clear()
    monkeypatch.setattr(ai_chat, "KNOWLEDGE_DIR", tmp_path)
    monkeypatch.setattr(
        ai_chat,
        "pdf_to_text",
        lambda data: "Информация из резервного PDF."
        if data == b"bundled-pdf"
        else "",
    )

    knowledge = ai_chat.load_knowledge(db)

    assert "college" in knowledge
    assert "Информация из резервного PDF." in knowledge


def test_chat_missing_knowledge_does_not_call_provider(client, monkeypatch):
    from app import ai_chat

    monkeypatch.setattr(ai_chat.ai_settings, "api_key", "test-only")
    monkeypatch.setattr(ai_chat, "load_knowledge", lambda db: "")

    def unexpected(*args):
        raise AssertionError("Provider must not be called without knowledge")

    monkeypatch.setattr(ai_chat, "stream_answer", unexpected)
    response = client.post("/api/v1/chat", json={"message": "Где колледж?"})
    assert response.status_code == 200
    assert response.text == ai_chat.NO_DATA


def test_chat_keeps_auth_and_origin_protection(client):
    assert (
        client.post(
            "/api/v1/chat",
            json={"message": "Вопрос"},
            headers={"Origin": "https://evil.example"},
        ).status_code
        == 403
    )
    del app.dependency_overrides[require_approved_student]
    assert client.post("/api/v1/chat", json={"message": "Вопрос"}).status_code == 401


def test_chat_stream_handles_provider_error(monkeypatch):
    from app import ai_chat

    def broken_client():
        raise RuntimeError("Provider unavailable")

    monkeypatch.setattr(ai_chat, "get_client", broken_client)
    assert "Ошибка ИИ-сервиса" in "".join(ai_chat.stream_answer("Контекст", "Вопрос"))


def application_payload(**overrides):
    return {
        "name": "Example IDE",
        "description": "Редактор кода",
        "description_kk": "Код редакторы",
        "url": "https://example.com/download",
        "logo_url": "/logos/vscode.png",
        "pricing": "freemium",
        **overrides,
    }


def test_application_admin_crud_persists_both_languages(client):
    login_schedule_admin(client)
    response = client.post("/api/v1/applications", json=application_payload())
    assert response.status_code == 201
    item = response.json()
    url = f"/api/v1/applications/{item['id']}"
    assert item["description_kk"] == "Код редакторы"
    assert "subject" not in item and "subject_kk" not in item
    assert item["pricing"] == "freemium"
    response = client.put(url, json=application_payload(name="Updated", pricing="paid"))
    assert response.status_code == 200
    assert client.get("/api/v1/applications").json()[0]["name"] == "Updated"
    assert (
        client.get("/api/v1/applications").json()[0]["description_kk"] == "Код редакторы"
    )
    assert client.delete(url).status_code == 204
    assert client.get("/api/v1/applications").json() == []
    assert client.put(url, json=application_payload()).status_code == 404
    assert client.delete(url).status_code == 404


def test_application_write_protection_for_every_mutation(client):
    del app.dependency_overrides[require_approved_student]

    def writes(status, headers=None):
        assert (
            client.post(
                "/api/v1/applications", json=application_payload(), headers=headers
            ).status_code
            == status
        )
        assert (
            client.put(
                "/api/v1/applications/1", json=application_payload(), headers=headers
            ).status_code
            == status
        )
        assert (
            client.delete("/api/v1/applications/1", headers=headers).status_code == status
        )

    writes(401)
    client.post("/api/v1/auth/register", json=student_payload())
    client.post(
        "/api/v1/auth/login",
        json={"email": "student@example.com", "password": student_payload()["password"]},
    )
    assert client.get("/api/v1/applications").status_code == 200
    writes(403)
    app.dependency_overrides[require_approved_student] = lambda: None
    login_schedule_admin(client)
    writes(403, {"Origin": "https://evil.example"})
    db = app.dependency_overrides[get_db]()
    db.scalar(select(User).where(User.role == "admin")).status = "blocked"
    db.commit()
    writes(403)


@pytest.mark.parametrize(
    "changes",
    [
        {"name": " "},
        {"description_kk": ""},
        {"subject_kk": " "},
        {"url": "javascript:alert(1)"},
        {"url": "https://user:pass@example.com"},
        {"logo_url": "data:image/svg+xml,evil"},
        {"logo_url": "//example.com/logo.png"},
        {"logo_url": "/logos/../secret"},
        {"pricing": "unknown"},
        {"name": "x" * 201},
    ],
)
def test_application_validation_keeps_saved_card(client, changes):
    login_schedule_admin(client)
    item = client.post("/api/v1/applications", json=application_payload()).json()
    url = f"/api/v1/applications/{item['id']}"
    assert (
        client.post(
            "/api/v1/applications", json=application_payload(**changes)
        ).status_code
        == 422
    )
    assert client.put(url, json=application_payload(**changes)).status_code == 422
    saved = client.get("/api/v1/applications").json()
    assert len(saved) == 1 and saved[0]["name"] == "Example IDE"


def test_chat_kazakh_language_and_fallback(client, monkeypatch):
    from app import ai_chat

    monkeypatch.setattr(ai_chat.ai_settings, "api_key", "test-only")
    monkeypatch.setattr(ai_chat, "load_knowledge", lambda db: "")
    response = client.post(
        "/api/v1/chat", json={"message": "Колледж қайда?", "language": "kk"}
    )
    assert response.text == "Әзірге бұл туралы ақпаратым жоқ."
    monkeypatch.setattr(ai_chat, "load_knowledge", lambda db: "Алматы")

    def answer(prompt, question, language):
        assert "тек қазақ тілінде" in prompt
        assert language == "kk"
        yield "Алматыда."

    monkeypatch.setattr(ai_chat, "stream_answer", answer)
    assert (
        client.post(
            "/api/v1/chat", json={"message": "Колледж қайда?", "language": "kk"}
        ).text
        == "Алматыда."
    )
    assert (
        client.post(
            "/api/v1/chat", json={"message": "Question", "language": "invalid"}
        ).status_code
        == 422
    )


def test_master_document_upload_and_college_sections_survive_merge(client):
    from pathlib import Path

    login_schedule_admin(client)
    pdf_path = next((Path(__file__).parents[1] / "app" / "document_files").glob("*.pdf"))
    pdf = pdf_path.read_bytes()
    response = client.post(
        "/api/v1/documents",
        data={"title": "Merge PDF check"},
        files={"file": ("check.pdf", pdf, "application/pdf")},
    )
    assert response.status_code == 201
    document = response.json()
    assert document["description"]
    assert client.get(document["url"]).content == pdf
    assert client.get("/api/v1/applications").status_code == 200
    section = client.post(
        "/api/v1/college-sections",
        json={"title": "Test section", "description": "Preserve master content"},
    )
    assert section.status_code == 201
    slug = section.json()["slug"]
    response = client.post(
        f"/api/v1/college-sections/{slug}/items",
        json={"title": "Test item", "summary": "Test summary", "content": "Details"},
    )
    assert response.status_code == 201
    assert (
        client.get(f"/api/v1/college-sections/{slug}/items").json()[0]["title"]
        == "Test item"
    )
    assert client.delete(f"/api/v1/documents/{document['id']}").status_code == 204
    response = client.post(
        "/api/v1/contests",
        json={
            "title": "Merge contest",
            "description": "Contest integration check",
            "dates": "December 2026",
            "signup_deadline": "2026-12-20",
            "format": "Online",
            "eligibility": "All students",
            "curator": "College",
            "details": ["Submit a project"],
        },
    )
    assert response.status_code == 201
    contest = response.json()
    response = client.post(
        "/api/v1/contest-signups",
        json={
            "contest_id": contest["slug"],
            "contest_title": contest["title"],
            "full_name": "Test Student",
            "group_name": "TEST-1",
            "course": "2",
            "contact": "test@example.com",
            "is_team": False,
            "consent": True,
        },
    )
    assert response.status_code == 201
    assert client.delete(f"/api/v1/contests/{contest['slug']}").status_code == 204
    assert client.get("/api/v1/contests").json() == []

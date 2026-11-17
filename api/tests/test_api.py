from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.auth import hash_password, require_approved_student
from app.db import Base, get_db
from app.main import app
from app.models import AuthSession, Lesson, User


@pytest.fixture
def client():
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


def test_schedule_write_rejects_guest_student_blocked_admin_and_cross_origin(client):
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
    assert client.put(url, json=schedule_payload()).status_code == 403
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

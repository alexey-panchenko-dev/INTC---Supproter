import base64
import json
from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app import schedule_ai, schedule_import
from app.auth import hash_password
from app.db import Base, get_db
from app.groups import normalize_group
from app.main import app
from app.models import Lesson, User
from app.schedule_ai import RecognitionError, decode_image, parse_model_output

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64
PNG_DATA_URL = "data:image/png;base64," + base64.b64encode(PNG).decode()

# Part of the real ТИС-24Р photo, transcribed the way the model is asked to return it.
WEEKLY_MODEL_OUTPUT = {
    "kind": "weekly",
    "group": "тис-24p",  # lowercase, Latin "p"
    "title": "6 учебных недель",
    "weeks_count": 6,
    "lessons": [
        {
            "weekday": 1,
            "date": None,
            "pair": 2,
            "starts_at": "9:30",
            "ends_at": "10.50",
            "subject": "Компьютерные сети",
            "teacher": "Юсупова Н.И.",
            "room": "Спортзал",
            "week": "even",
            "note": "красн.: 05.10",
        },
        {
            "weekday": 1,
            "date": None,
            "pair": 1,
            "starts_at": "08:00",
            "ends_at": "09:20",
            "subject": "Установка и настройка ОС и ПО",
            "teacher": "Манатбай А.А.",
            "room": "606",
            "week": "every",
            "note": None,
        },
        {
            "weekday": 1,
            "date": None,
            "pair": 2,
            "starts_at": "09:30",
            "ends_at": "10:50",
            "subject": "Основы сетевой безопасности",
            "teacher": "Тұрсынова Ә.Ғ.",
            "room": "506",
            "week": "odd",
            "note": None,
        },
        {
            "weekday": 2,
            "date": None,
            "pair": 4,
            "starts_at": "13:00",
            "ends_at": "14:20",
            "subject": "",
            "teacher": "",
            "room": "",
            "week": "every",
            "note": None,
        },
        {
            "weekday": None,
            "date": None,
            "pair": 3,
            "starts_at": "11:00",
            "ends_at": "12:20",
            "subject": "Без дня",
            "teacher": "",
            "room": "",
            "week": "every",
            "note": None,
        },
    ],
    "warnings": ["Пометка «2 пара» во вторник"],
}


def weekly_lesson(**changes):
    return {
        "weekday": 1,
        "pair": 2,
        "starts_at": "09:30",
        "ends_at": "10:50",
        "subject": "Основы сетевой безопасности",
        "teacher": "Тұрсынова Ә.Ғ.",
        "room": "506",
        "week": "every",
        "note": None,
        **changes,
    }


def dated_lesson(day, **changes):
    return {
        "date": day,
        "starts_at": "08:00",
        "ends_at": "13:50",
        "subject": "Практика: информационная безопасность",
        "teacher": "Аламанова А.А.",
        "room": "403",
        "note": None,
        **changes,
    }


@pytest.fixture
def db_session():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    engine.dispose()


@pytest.fixture
def client(db_session, monkeypatch):
    monkeypatch.setattr(schedule_ai.vision_settings, "api_key", "test-only")
    schedule_import._recent.clear()
    app.dependency_overrides[get_db] = lambda: db_session
    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.clear()


def login(client, db, role="student", group="ТИС-24Р", email=None):
    email = email or f"{role}-{group}@example.com".lower()
    db.add(
        User(
            email=email,
            first_name="Имя",
            last_name="Фамилия",
            role=role,
            status="approved",
            group_name=group if role == "student" else None,
            password_hash=hash_password("Password-123"),
        )
    )
    db.commit()
    client.cookies.clear()
    response = client.post(
        "/api/v1/auth/login", json={"email": email, "password": "Password-123"}
    )
    assert response.status_code == 200


def lessons_on(client, group, day):
    response = client.get("/api/v1/schedule", params={"group": group, "day": day})
    assert response.status_code == 200
    return [(row["starts_at"], row["subject"], row["teacher"]) for row in response.json()]


# ---------- Recognition ----------


def test_group_normalization():
    assert normalize_group(" тис 24p ") == "ТИС-24Р"
    assert normalize_group("ТИС - 24Р") == "ТИС-24Р"
    assert normalize_group("is-23-1") == "IS-23-1"  # Latin-only names stay Latin


def test_model_output_is_normalized_into_safe_draft():
    draft = parse_model_output(json.dumps(WEEKLY_MODEL_OUTPUT))
    assert draft.kind == "weekly"
    assert draft.group == "ТИС-24Р"
    assert draft.weeks_count == 6
    rows = [(row.weekday, row.starts_at, row.ends_at, row.week) for row in draft.lessons]
    assert rows == [
        (1, "08:00", "09:20", "every"),
        (1, "09:30", "10:50", "even"),
        (1, "09:30", "10:50", "odd"),
    ]
    assert any("день недели" in warning for warning in draft.warnings)
    assert draft.start_date is None  # not printed on the photo

    printed = {**WEEKLY_MODEL_OUTPUT, "start_date": "2026-10-10"}
    assert parse_model_output(json.dumps(printed)).start_date == date(2026, 10, 10)
    unreadable = {**WEEKLY_MODEL_OUTPUT, "start_date": "10 октября"}
    assert parse_model_output(json.dumps(unreadable)).start_date is None


def test_abbreviation_is_expanded_only_when_unambiguous():
    rows = [
        {**weekly_lesson(subject="КС", week="even"), "date": None},
        {**weekly_lesson(weekday=4, subject="Компьютерные сети"), "date": None},
        {**weekly_lesson(weekday=5, subject="ОС"), "date": None},  # no full name
        {**weekly_lesson(weekday=5, subject="ФК", starts_at="08:00", ends_at="09:20")},
    ]
    draft = parse_model_output(
        json.dumps({"kind": "weekly", "lessons": rows, "warnings": []})
    )
    assert [row.subject for row in draft.lessons] == [
        "Компьютерные сети",
        "Компьютерные сети",
        "ФК",
        "ОС",
    ]


@pytest.mark.parametrize(
    "raw", ["not json", "[]", json.dumps({"kind": "monthly", "lessons": []})]
)
def test_invalid_model_output_is_rejected(raw):
    with pytest.raises(RecognitionError):
        parse_model_output(raw)


def test_dated_draft_drops_rows_without_date_and_bad_time_warns():
    draft = parse_model_output(
        json.dumps(
            {
                "kind": "dated",
                "group": "ТИС-24Р",
                "title": "Практика",
                "weeks_count": None,
                "lessons": [
                    {
                        **dated_lesson("2026-11-18"),
                        "weekday": 3,
                        "pair": None,
                        "week": "odd",
                    },
                    {
                        **dated_lesson("18.11"),
                        "weekday": None,
                        "pair": None,
                        "week": "every",
                    },
                    {
                        **dated_lesson("2026-11-19", starts_at="25:00"),
                        "weekday": None,
                        "pair": None,
                        "week": "every",
                    },
                ],
                "warnings": [],
            }
        )
    )
    assert [row.date for row in draft.lessons] == [date(2026, 11, 18), date(2026, 11, 19)]
    assert draft.lessons[0].week == "every" and draft.lessons[0].weekday is None
    assert draft.lessons[1].starts_at == ""
    assert any("дату" in warning for warning in draft.warnings)
    assert any("время" in warning for warning in draft.warnings)


def test_image_validation():
    assert decode_image(PNG_DATA_URL)[1] == "image/png"
    jpeg = base64.b64encode(b"\xff\xd8\xff\xe0" + b"\x00" * 16).decode()
    assert decode_image(jpeg)[1] == "image/jpeg"
    for bad in (
        "data:image/gif;base64," + base64.b64encode(b"GIF89a" + b"\x00" * 16).decode(),
        "data:image/png;base64,%%%not-base64%%%",
    ):
        with pytest.raises(RecognitionError):
            decode_image(bad)


def test_recognize_endpoint(client, db_session, monkeypatch):
    assert (
        client.post(
            "/api/v1/schedule/recognize", json={"image": PNG_DATA_URL}
        ).status_code
        == 401
    )
    login(client, db_session)
    calls = []

    def fake_model(image, mime, today):
        calls.append((image, mime))
        return json.dumps(WEEKLY_MODEL_OUTPUT)

    monkeypatch.setattr(schedule_ai, "call_model", fake_model)
    response = client.post("/api/v1/schedule/recognize", json={"image": PNG_DATA_URL})
    assert response.status_code == 200
    assert response.json()["group"] == "ТИС-24Р"
    assert len(response.json()["lessons"]) == 3
    assert calls == [(PNG, "image/png")]

    bad_image = (
        "data:image/gif;base64," + base64.b64encode(b"GIF89a" + b"\0" * 16).decode()
    )
    assert (
        client.post("/api/v1/schedule/recognize", json={"image": bad_image}).status_code
        == 422
    )
    assert (
        client.post(
            "/api/v1/schedule/recognize",
            json={"image": PNG_DATA_URL},
            headers={"Origin": "https://evil.example"},
        ).status_code
        == 403
    )

    def broken_model(*args):
        raise RuntimeError("provider down")

    monkeypatch.setattr(schedule_ai, "call_model", broken_model)
    response = client.post("/api/v1/schedule/recognize", json={"image": PNG_DATA_URL})
    assert response.status_code == 502
    assert "недоступен" in response.json()["detail"]

    def exhausted_model(*args):
        raise schedule_ai.AIQuotaExceededError("Закончились запросы на ИИ-модель")

    monkeypatch.setattr(schedule_ai, "call_model", exhausted_model)
    response = client.post("/api/v1/schedule/recognize", json={"image": PNG_DATA_URL})
    assert response.status_code == 402
    assert "Закончились запросы" in response.json()["detail"]

    monkeypatch.setattr(schedule_ai.vision_settings, "api_key", "")
    assert (
        client.post(
            "/api/v1/schedule/recognize", json={"image": PNG_DATA_URL}
        ).status_code
        == 503
    )


def test_recognize_rate_limit(client, db_session, monkeypatch):
    login(client, db_session)
    monkeypatch.setattr(schedule_import, "RECOGNITIONS_PER_HOUR", 2)
    monkeypatch.setattr(
        schedule_ai, "call_model", lambda *args: json.dumps(WEEKLY_MODEL_OUTPUT)
    )
    codes = [
        client.post(
            "/api/v1/schedule/recognize", json={"image": PNG_DATA_URL}
        ).status_code
        for _ in range(3)
    ]
    assert codes == [200, 200, 429]


# ---------- Publishing ----------


def test_weekly_import_alternates_black_and_red_weeks(client, db_session):
    login(client, db_session)
    payload = {
        "kind": "weekly",
        "group": "ТИС-24Р",
        "start_date": "2026-09-28",  # Monday → week 1
        "weeks": 4,
        "lessons": [
            weekly_lesson(week="odd"),
            weekly_lesson(
                week="even",
                subject="Компьютерные сети",
                teacher="Юсупова Н.И.",
                room="Спортзал",
                note="красн.: 05.10",
            ),
            weekly_lesson(pair=1, starts_at="08:00", ends_at="09:20", subject="ОС"),
            weekly_lesson(weekday=2, subject="Вторник", week="odd"),
        ],
    }
    response = client.post("/api/v1/schedule/import", json=payload)
    assert response.status_code == 200, response.text
    assert response.json() == {
        "group": "ТИС-24Р",
        "first_date": "2026-09-28",
        "last_date": "2026-10-25",
        "days_with_lessons": 6,
        "lessons_created": 10,
    }
    black = ("09:30", "Основы сетевой безопасности", "Тұрсынова Ә.Ғ.")
    red = ("09:30", "Компьютерные сети", "Юсупова Н.И.")
    for day, expected in (
        ("2026-09-28", black),  # week 1
        ("2026-10-05", red),  # week 2
        ("2026-10-12", black),  # week 3
        ("2026-10-19", red),  # week 4
    ):
        assert lessons_on(client, "ТИС-24Р", day) == [
            ("08:00", "ОС", "Тұрсынова Ә.Ғ."),
            expected,
        ]
    assert lessons_on(client, "ТИС-24Р", "2026-10-26") == []  # after the 4th week
    assert [row[1] for row in lessons_on(client, "ТИС-24Р", "2026-09-29")] == ["Вторник"]
    assert lessons_on(client, "ТИС-24Р", "2026-10-06") == []  # even Tuesday
    response = client.get(
        "/api/v1/schedule", params={"group": "ТИС-24Р", "day": "2026-10-05"}
    )
    assert response.json()[1]["note"] == "красн.: 05.10"


def test_weekly_import_starting_midweek_counts_calendar_weeks(client, db_session):
    login(client, db_session)
    payload = {
        "kind": "weekly",
        "group": "ТИС-24Р",
        "start_date": "2026-09-30",  # Wednesday: week 1 is 28.09–04.10
        "weeks": 2,
        "lessons": [
            weekly_lesson(week="odd"),
            weekly_lesson(week="even", subject="Красная"),
        ],
    }
    response = client.post("/api/v1/schedule/import", json=payload)
    assert response.json()["last_date"] == "2026-10-11"
    assert lessons_on(client, "ТИС-24Р", "2026-09-28") == []  # before start_date
    assert lessons_on(client, "ТИС-24Р", "2026-10-05")[0][1] == "Красная"


def test_weekend_start_begins_six_study_weeks_next_monday(client, db_session):
    login(client, db_session)
    payload = {
        "kind": "weekly",
        "group": "ТИС-24Р",
        "start_date": "2026-10-10",  # «с 10 октября» — Saturday
        "weeks": 6,  # «6 учебных недель»
        "lessons": [
            weekly_lesson(week="odd"),
            weekly_lesson(week="even", subject="Красная"),
            weekly_lesson(weekday=6, subject="Суббота"),
        ],
    }
    response = client.post("/api/v1/schedule/import", json=payload)
    assert response.status_code == 200, response.text
    assert response.json()["first_date"] == "2026-10-12"
    assert response.json()["last_date"] == "2026-11-22"
    assert lessons_on(client, "ТИС-24Р", "2026-10-10") == []  # not a study week yet
    mondays = ["2026-10-12", "2026-10-19", "2026-10-26", "2026-11-02", "2026-11-09"]
    subjects = [lessons_on(client, "ТИС-24Р", day)[0][1] for day in mondays]
    assert subjects == [
        "Основы сетевой безопасности",
        "Красная",
        "Основы сетевой безопасности",
        "Красная",
        "Основы сетевой безопасности",
    ]
    assert lessons_on(client, "ТИС-24Р", "2026-11-16")[0][1] == "Красная"  # week 6
    assert lessons_on(client, "ТИС-24Р", "2026-11-23") == []  # after 6 weeks


def test_weekly_import_replaces_period_only_for_its_group(client, db_session):
    login(client, db_session)
    old = dict(starts_at="12:00", ends_at="13:00", subject="Старое", teacher="", room="")
    db_session.add_all(
        [
            Lesson(group_name="ТИС-24Р", date=date(2026, 10, 1), **old),
            Lesson(group_name="ТИС-24Р", date=date(2026, 11, 2), **old),
            Lesson(group_name="ИС-1", date=date(2026, 10, 1), **old),
        ]
    )
    db_session.commit()
    payload = {
        "kind": "weekly",
        "group": "тис 24р",
        "start_date": "2026-09-28",
        "weeks": 1,
        "lessons": [weekly_lesson()],
    }
    assert client.post("/api/v1/schedule/import", json=payload).status_code == 200
    assert lessons_on(client, "ТИС-24Р", "2026-10-01") == []
    assert lessons_on(client, "ТИС-24Р", "2026-11-02")[0][1] == "Старое"
    assert lessons_on(client, "ИС-1", "2026-10-01")[0][1] == "Старое"
    author = db_session.scalar(select(Lesson).where(Lesson.date == date(2026, 9, 28)))
    assert author.created_by_id is not None


def test_practice_import_replaces_only_its_dates(client, db_session):
    login(client, db_session)
    db_session.add_all(
        [
            Lesson(
                group_name="ТИС-24Р",
                date=date(2026, 11, d),
                starts_at="08:00",
                ends_at="09:20",
                subject="Обычная пара",
                teacher="",
                room="",
            )
            for d in (17, 18)
        ]
    )
    db_session.commit()
    payload = {
        "kind": "dated",
        "group": "ТИС-24Р",
        "lessons": [
            dated_lesson("2026-11-18"),
            dated_lesson("2026-11-20", note="1,2 пп (онл)"),
            dated_lesson("2026-11-24", starts_at="08:30", ends_at="12:50"),
        ],
    }
    response = client.post("/api/v1/schedule/import", json=payload)
    assert response.status_code == 200, response.text
    assert response.json()["first_date"] == "2026-11-18"
    assert response.json()["last_date"] == "2026-11-24"
    assert lessons_on(client, "ТИС-24Р", "2026-11-17")[0][1] == "Обычная пара"
    assert lessons_on(client, "ТИС-24Р", "2026-11-18")[0][0] == "08:00"
    assert lessons_on(client, "ТИС-24Р", "2026-11-18")[0][1].startswith("Практика")
    assert lessons_on(client, "ТИС-24Р", "2026-11-24")[0][0] == "08:30"


def test_overlap_after_expansion_is_rejected_without_changes(client, db_session):
    login(client, db_session)
    payload = {
        "kind": "weekly",
        "group": "ТИС-24Р",
        "start_date": "2026-09-28",
        "weeks": 2,
        # Both "every" — the model forgot to mark the red one as "even".
        "lessons": [weekly_lesson(), weekly_lesson(subject="Компьютерные сети")],
    }
    response = client.post("/api/v1/schedule/import", json=payload)
    assert response.status_code == 422
    assert "пересекаются" in response.json()["detail"]
    assert "1-я неделя" in response.json()["detail"]
    assert db_session.scalars(select(Lesson)).all() == []
    payload["lessons"][1]["week"] = "even"
    payload["lessons"][0]["week"] = "odd"
    assert client.post("/api/v1/schedule/import", json=payload).status_code == 200


def test_import_permissions(client, db_session):
    payload = {
        "kind": "dated",
        "group": "ТИС-24Р",
        "lessons": [dated_lesson("2026-11-18")],
    }
    assert client.post("/api/v1/schedule/import", json=payload).status_code == 401
    login(client, db_session, group="ИС-1")
    response = client.post("/api/v1/schedule/import", json=payload)
    assert response.status_code == 403
    assert db_session.scalars(select(Lesson)).all() == []
    login(client, db_session, group="тис-24p", email="classmate@example.com")
    assert client.post("/api/v1/schedule/import", json=payload).status_code == 200
    assert (
        client.post(
            "/api/v1/schedule/import",
            json=payload,
            headers={"Origin": "https://evil.example"},
        ).status_code
        == 403
    )
    login(client, db_session, role="admin")
    other = {**payload, "group": "ИС-2"}
    assert client.post("/api/v1/schedule/import", json=other).status_code == 200


@pytest.mark.parametrize(
    "changes",
    [
        {"weeks": 0},
        {"weeks": 31},
        {"start_date": "28.09.2026"},
        {"lessons": []},
        {"lessons": [weekly_lesson(starts_at="9:30")]},
        {"lessons": [weekly_lesson(starts_at="11:00", ends_at="10:00")]},
        {"lessons": [weekly_lesson(weekday=8)]},
        {"lessons": [weekly_lesson(week="sometimes")]},
        {"lessons": [weekly_lesson(subject=" ")]},
        {"lessons": [weekly_lesson(extra="field")]},
        {"group": " "},
        {"kind": "monthly"},
    ],
)
def test_import_validation(client, db_session, changes):
    login(client, db_session)
    payload = {
        "kind": "weekly",
        "group": "ТИС-24Р",
        "start_date": "2026-09-28",
        "weeks": 6,
        "lessons": [weekly_lesson()],
        **changes,
    }
    assert client.post("/api/v1/schedule/import", json=payload).status_code == 422

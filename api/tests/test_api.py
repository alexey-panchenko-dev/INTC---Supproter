from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.auth import require_approved_student
from app.db import Base, get_db
from app.main import app
from app.models import Lesson


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

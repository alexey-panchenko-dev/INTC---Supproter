"""Opt-in PostgreSQL checks for both histories that originally used revision 0003."""

import os
import uuid

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.pool import NullPool

from app.config import settings

pytestmark = pytest.mark.skipif(
    os.getenv("RUN_POSTGRES_MIGRATIONS") != "1",
    reason="Set RUN_POSTGRES_MIGRATIONS=1 with local PostgreSQL running",
)


@pytest.mark.parametrize("source", ["fresh", "master", "plugins"])
def test_both_migration_histories_preserve_data(monkeypatch, source):
    schema = f"merge_check_{uuid.uuid4().hex}"
    admin_engine = create_engine(settings.database_url, poolclass=NullPool)
    migration_engine = create_engine(
        settings.database_url,
        connect_args={"options": f"-c search_path={schema}"},
        poolclass=NullPool,
    )
    monkeypatch.setattr("app.db.engine", migration_engine)
    cfg = Config("alembic.ini")
    try:
        with admin_engine.begin() as db:
            db.execute(text(f"CREATE SCHEMA {schema}"))
        if source != "fresh":
            command.upgrade(cfg, "0008" if source == "master" else "0002")
            with migration_engine.begin() as db:
                db.execute(
                    text(
                        "INSERT INTO applications (name,description,subject,url) VALUES ('Existing custom tool','Keep description','Legacy','https://example.com')"
                    )
                )
                if source == "plugins":
                    # Original plugins 0003, with a deliberately edited sparse catalog.
                    db.execute(
                        text(
                            "ALTER TABLE applications ADD COLUMN description_kk TEXT NOT NULL DEFAULT '', ADD COLUMN subject_kk VARCHAR(200) NOT NULL DEFAULT '', ADD COLUMN logo_url TEXT NOT NULL DEFAULT '', ADD COLUMN pricing VARCHAR(20) NOT NULL DEFAULT 'free', ADD CONSTRAINT application_pricing CHECK (pricing IN ('free','freemium','paid'))"
                        )
                    )
                    db.execute(
                        text(
                            "UPDATE applications SET description_kk='Keep translation', pricing='paid'"
                        )
                    )
                    db.execute(text("UPDATE alembic_version SET version_num='0003'"))
        command.upgrade(cfg, "head")
        command.check(cfg)
        assert {"file_data", "description", "sort_order"} <= {
            column["name"]
            for column in inspect(migration_engine).get_columns("documents")
        }
        with migration_engine.connect() as db:
            assert db.scalar(text("SELECT version_num FROM alembic_version")) == "0010"
            lesson_columns = {
                column["name"]
                for column in inspect(migration_engine).get_columns("lessons")
            }
            assert {"note", "created_by_id"} <= lesson_columns
            assert (
                db.scalar(text("SELECT count(*) FROM applications"))
                == {
                    "fresh": 8,
                    "master": 9,
                    "plugins": 1,
                }[source]
            )
            if source != "fresh":
                row = db.execute(
                    text(
                        "SELECT description,description_kk,pricing FROM applications WHERE name='Existing custom tool'"
                    )
                ).one()
                assert row.description == "Keep description"
                if source == "plugins":
                    assert row.description_kk == "Keep translation"
                    assert row.pricing == "paid"
    finally:
        migration_engine.dispose()
        with admin_engine.begin() as db:
            db.execute(text(f"DROP SCHEMA IF EXISTS {schema} CASCADE"))
        admin_engine.dispose()

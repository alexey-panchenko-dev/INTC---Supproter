"""Initial student portal tables."""

import sqlalchemy as sa
from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "students",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(254), nullable=False, unique=True),
        sa.Column("first_name", sa.String(100), nullable=False),
        sa.Column("last_name", sa.String(100), nullable=False),
        sa.Column("group_name", sa.String(50), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("role", sa.String(20), nullable=False, server_default="student"),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.CheckConstraint("status IN ('pending', 'approved', 'blocked')"),
        sa.CheckConstraint("role IN ('student', 'admin')"),
    )
    op.create_table(
        "documents",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(250), nullable=False),
        sa.Column("category", sa.String(100), nullable=False),
        sa.Column("url", sa.Text(), nullable=False),
    )
    op.create_table(
        "lessons",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("group_name", sa.String(50), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("starts_at", sa.String(5), nullable=False),
        sa.Column("ends_at", sa.String(5), nullable=False),
        sa.Column("subject", sa.String(200), nullable=False),
        sa.Column("teacher", sa.String(200), nullable=False),
        sa.Column("room", sa.String(50), nullable=False),
    )
    op.create_index("ix_lessons_group_name", "lessons", ["group_name"])
    op.create_index("ix_lessons_date", "lessons", ["date"])
    op.create_table(
        "applications",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("subject", sa.String(200), nullable=False),
        sa.Column("url", sa.Text(), nullable=False),
    )


def downgrade():
    op.drop_table("applications")
    op.drop_index("ix_lessons_date", table_name="lessons")
    op.drop_index("ix_lessons_group_name", table_name="lessons")
    op.drop_table("lessons")
    op.drop_table("documents")
    op.drop_table("students")

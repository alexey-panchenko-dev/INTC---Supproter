"""Lesson notes and author of the published schedule."""

import sqlalchemy as sa
from alembic import op

revision = "0010"
down_revision = "0009"
branch_labels = None
depends_on = None


def upgrade():
    connection = op.get_bind()
    lesson_columns = {
        column["name"] for column in sa.inspect(connection).get_columns("lessons")
    }
    if "note" not in lesson_columns:
        op.add_column("lessons", sa.Column("note", sa.String(200), nullable=True))
    if "created_by_id" not in lesson_columns:
        op.add_column(
            "lessons",
            sa.Column(
                "created_by_id",
                sa.Integer(),
                sa.ForeignKey("users.id", ondelete="SET NULL"),
                nullable=True,
            ),
        )


def downgrade():
    connection = op.get_bind()
    lesson_columns = {
        column["name"] for column in sa.inspect(connection).get_columns("lessons")
    }
    if "created_by_id" in lesson_columns:
        op.drop_column("lessons", "created_by_id")
    if "note" in lesson_columns:
        op.drop_column("lessons", "note")

"""Users and revocable authentication sessions."""

import sqlalchemy as sa
from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade():
    op.rename_table("students", "users")
    op.alter_column("users", "group_name", existing_type=sa.String(50), nullable=True)
    op.alter_column("users", "status", server_default="approved")
    op.create_check_constraint(
        "student_group_required",
        "users",
        "role = 'admin' OR (group_name IS NOT NULL AND length(trim(group_name)) > 0)",
    )
    op.create_table(
        "auth_sessions",
        sa.Column("token_hash", sa.String(64), primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("expires_at", sa.Integer(), nullable=False),
    )
    op.create_index("ix_auth_sessions_user_id", "auth_sessions", ["user_id"])


def downgrade():
    op.drop_table("auth_sessions")
    op.drop_constraint("student_group_required", "users", type_="check")
    op.execute("UPDATE users SET group_name = '' WHERE group_name IS NULL")
    op.alter_column("users", "group_name", existing_type=sa.String(50), nullable=False)
    op.alter_column("users", "status", server_default="pending")
    op.rename_table("users", "students")

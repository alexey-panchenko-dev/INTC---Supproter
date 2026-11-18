"""Queue existing students for administrator review."""

import sqlalchemy as sa
from alembic import op

revision = "0011"
down_revision = "0010"
branch_labels = None
depends_on = None


def upgrade():
    users = sa.table(
        "users",
        sa.column("role", sa.String()),
        sa.column("status", sa.String()),
    )
    op.execute(
        users.update()
        .where(users.c.role == "student", users.c.status == "approved")
        .values(status="pending")
    )


def downgrade():
    users = sa.table(
        "users",
        sa.column("role", sa.String()),
        sa.column("status", sa.String()),
    )
    op.execute(
        users.update()
        .where(users.c.role == "student", users.c.status == "pending")
        .values(status="approved")
    )

"""Store admin-created college contests."""

import sqlalchemy as sa
from alembic import op

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "college_contests",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("slug", sa.String(100), nullable=False),
        sa.Column("title", sa.String(250), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("dates", sa.String(250), nullable=False),
        sa.Column("signup_deadline", sa.Date(), nullable=False),
        sa.Column("format", sa.String(250), nullable=False),
        sa.Column("eligibility", sa.Text(), nullable=False),
        sa.Column("curator", sa.String(200), nullable=False),
        sa.Column("photo_filename", sa.String(250), nullable=True),
        sa.Column("details", sa.JSON(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_index("ix_college_contests_slug", "college_contests", ["slug"], unique=True)
    op.alter_column("college_contests", "sort_order", server_default=None)


def downgrade():
    op.drop_index("ix_college_contests_slug", table_name="college_contests")
    op.drop_table("college_contests")

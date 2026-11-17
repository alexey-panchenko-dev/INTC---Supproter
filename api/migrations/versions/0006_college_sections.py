"""Persist admin-created college life sections."""

import sqlalchemy as sa
from alembic import op

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "college_sections",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("slug", sa.String(100), nullable=False),
        sa.Column("title", sa.String(120), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_index("ix_college_sections_slug", "college_sections", ["slug"], unique=True)
    op.alter_column("college_sections", "sort_order", server_default=None)


def downgrade():
    op.drop_index("ix_college_sections_slug", table_name="college_sections")
    op.drop_table("college_sections")

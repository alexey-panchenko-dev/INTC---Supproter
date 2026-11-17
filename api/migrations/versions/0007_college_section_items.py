"""Add editable materials to college life sections."""

import sqlalchemy as sa
from alembic import op

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "college_section_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "section_id",
            sa.Integer(),
            sa.ForeignKey("college_sections.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(160), nullable=False),
        sa.Column("summary", sa.String(500), nullable=False),
        sa.Column("content", sa.Text(), nullable=False, server_default=""),
        sa.Column("link_url", sa.Text(), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_index(
        "ix_college_section_items_section_id",
        "college_section_items",
        ["section_id"],
    )
    op.alter_column("college_section_items", "content", server_default=None)
    op.alter_column("college_section_items", "sort_order", server_default=None)


def downgrade():
    op.drop_index(
        "ix_college_section_items_section_id", table_name="college_section_items"
    )
    op.drop_table("college_section_items")

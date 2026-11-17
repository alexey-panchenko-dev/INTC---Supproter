"""Store document summaries and PDF files."""

import sqlalchemy as sa
from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "documents",
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
    )
    op.add_column("documents", sa.Column("file_name", sa.String(250)))
    op.add_column("documents", sa.Column("file_data", sa.LargeBinary()))
    op.add_column(
        "documents",
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
    )
    op.alter_column("documents", "description", server_default=None)
    op.alter_column("documents", "sort_order", server_default=None)


def downgrade():
    op.drop_column("documents", "sort_order")
    op.drop_column("documents", "file_data")
    op.drop_column("documents", "file_name")
    op.drop_column("documents", "description")

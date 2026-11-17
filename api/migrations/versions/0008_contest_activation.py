"""Track active contests so administrators can archive them."""

import sqlalchemy as sa
from alembic import op

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "college_contests",
        sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
    )
    op.alter_column("college_contests", "is_active", server_default=None)


def downgrade():
    op.drop_column("college_contests", "is_active")

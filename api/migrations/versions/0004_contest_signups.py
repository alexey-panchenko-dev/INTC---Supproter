"""Store contest registration forms."""

import sqlalchemy as sa
from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "contest_signups",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("contest_id", sa.String(100), nullable=False),
        sa.Column("contest_title", sa.String(250), nullable=False),
        sa.Column("full_name", sa.String(250), nullable=False),
        sa.Column("group_name", sa.String(50), nullable=False),
        sa.Column("course", sa.String(20), nullable=False),
        sa.Column("contact", sa.String(200), nullable=False),
        sa.Column("is_team", sa.Boolean(), nullable=False),
        sa.Column("team_name", sa.String(200), nullable=True),
        sa.Column("team_members", sa.Text(), nullable=True),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("consent", sa.Boolean(), nullable=False),
        sa.Column("consented_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "submitted_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.CheckConstraint(
            "NOT is_team OR (team_name IS NOT NULL AND length(trim(team_name)) > 0 "
            "AND team_members IS NOT NULL AND length(trim(team_members)) > 0)",
            name="team_details_required",
        ),
        sa.CheckConstraint("consent IS TRUE", name="consent_required"),
    )
    op.create_index("ix_contest_signups_user_id", "contest_signups", ["user_id"])
    op.create_index("ix_contest_signups_contest_id", "contest_signups", ["contest_id"])


def downgrade():
    op.drop_index("ix_contest_signups_contest_id", table_name="contest_signups")
    op.drop_index("ix_contest_signups_user_id", table_name="contest_signups")
    op.drop_table("contest_signups")

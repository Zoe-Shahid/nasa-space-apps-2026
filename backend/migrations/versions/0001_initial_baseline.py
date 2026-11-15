"""Create the schema-only canonical domain registry.

Revision ID: 0001_initial_baseline
Revises:
"""

import sqlalchemy as sa
from alembic import op

revision = "0001_initial_baseline"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "domain_catalog",
        sa.Column("domain_id", sa.String(length=32), nullable=False),
        sa.CheckConstraint(
            "domain_id IN ('cardiovascular', 'sleep_fatigue', 'psychological', "
            "'musculoskeletal', 'immune', 'radiation')",
            name="canonical_domain_id",
        ),
        sa.PrimaryKeyConstraint("domain_id", name="pk_domain_catalog"),
    )


def downgrade() -> None:
    op.drop_table("domain_catalog")

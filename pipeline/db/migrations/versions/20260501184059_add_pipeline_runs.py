"""add_pipeline_runs

Revision ID: 20260501184059
Revises:
Create Date: 2026-05-01 18:40:59.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '20260501184059'
down_revision: Union[str, None] = 'p12whitelabel001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create pipeline_runs table
    op.create_table(
        'pipeline_runs',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('job_id', sa.String(64), nullable=False),
        sa.Column('ran_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('status', sa.String(16), nullable=False),
        sa.Column('message', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    # Create index on job_id for faster lookups
    op.create_index('ix_pipeline_runs_job_id', 'pipeline_runs', ['job_id'])


def downgrade() -> None:
    # Drop index first, then table
    op.drop_index('ix_pipeline_runs_job_id', table_name='pipeline_runs')
    op.drop_table('pipeline_runs')

"""p32_dimensiones_iex — D1-D7 por ocupación (transparencia TRC, módulo M1)

Revision ID: p32iexdim001
Revises: p31iex001
Create Date: 2026-06-11

"""
from alembic import op
import sqlalchemy as sa

revision = 'p32iexdim001'
down_revision = 'p31iex001'
branch_labels = None
depends_on = None

_DIMS = [f'dim_d{i}' for i in range(1, 8)]


def upgrade() -> None:
    for col in _DIMS:
        op.add_column('exposicion_iex', sa.Column(col, sa.Float(), nullable=True))


def downgrade() -> None:
    for col in reversed(_DIMS):
        op.drop_column('exposicion_iex', col)

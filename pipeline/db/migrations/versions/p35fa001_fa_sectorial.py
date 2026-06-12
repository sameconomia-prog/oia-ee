"""p35_fa_sectorial — fricción de adopción por grupo SOC (propuesta aprobada)

Revision ID: p35fa001
Revises: p34ctxmx001
Create Date: 2026-06-11

"""
from alembic import op
import sqlalchemy as sa

revision = 'p35fa001'
down_revision = 'p34ctxmx001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'fa_sectorial',
        sa.Column('grupo_soc', sa.String(2), primary_key=True),
        sa.Column('fa', sa.Float(), nullable=False),
        sa.Column('justificacion', sa.Text()),
        sa.Column('fuente', sa.String(50)),
        sa.Column('es_aproximacion', sa.Boolean(), nullable=False,
                  server_default=sa.true()),
        sa.Column('updated_at', sa.DateTime(timezone=True)),
    )


def downgrade() -> None:
    op.drop_table('fa_sectorial')

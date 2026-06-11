"""p33_costo_ia — comparativo coste IA vs humano por ocupación (módulo M3)

Revision ID: p33costoia001
Revises: p32iexdim001
Create Date: 2026-06-11

"""
from alembic import op
import sqlalchemy as sa

revision = 'p33costoia001'
down_revision = 'p32iexdim001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'costo_ia_ocupacion',
        sa.Column('soc_code', sa.String(10), primary_key=True),
        sa.Column('salario_mes_mxn', sa.Float()),
        sa.Column('salario_hora_mxn', sa.Float()),
        sa.Column('costo_ia_hora_mxn', sa.Float()),
        sa.Column('ratio_costo', sa.Float()),
        sa.Column('modelo_ref', sa.String(40)),
        sa.Column('supuestos', sa.Text()),
        sa.Column('fecha_calculo', sa.DateTime(timezone=True)),
    )


def downgrade() -> None:
    op.drop_table('costo_ia_ocupacion')

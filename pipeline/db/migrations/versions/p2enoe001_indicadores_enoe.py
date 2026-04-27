"""p2b_indicadores_enoe

Revision ID: p2enoe001
Revises: p2imss001
Create Date: 2026-04-27

"""
from alembic import op
import sqlalchemy as sa

revision = 'p2enoe001'
down_revision = 'p2imss001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'indicador_enoe',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('estado', sa.String(100), nullable=False),
        sa.Column('anio', sa.Integer(), nullable=False),
        sa.Column('trimestre', sa.Integer(), nullable=False),
        sa.Column('tasa_desempleo', sa.Float()),
        sa.Column('poblacion_ocupada', sa.Integer()),
        sa.Column('fecha_corte', sa.Date()),
        sa.UniqueConstraint('estado', 'anio', 'trimestre',
                            name='uq_enoe_estado_periodo'),
    )
    op.create_index('idx_enoe_estado_periodo', 'indicador_enoe',
                    ['estado', 'anio', 'trimestre'])


def downgrade() -> None:
    op.drop_index('idx_enoe_estado_periodo', table_name='indicador_enoe')
    op.drop_table('indicador_enoe')

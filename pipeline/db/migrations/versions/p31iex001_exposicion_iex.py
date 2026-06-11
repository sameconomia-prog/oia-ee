"""p31_exposicion_iex — puente ciencia→producto (datasets IEX de oia-ee-research)

Revision ID: p31iex001
Revises: 20260508000002
Create Date: 2026-06-11

"""
from alembic import op
import sqlalchemy as sa

revision = 'p31iex001'
down_revision = '20260508000002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'exposicion_iex',
        sa.Column('soc_code', sa.String(10), primary_key=True),
        sa.Column('titulo', sa.Text()),
        sa.Column('iex_v1', sa.Float()),
        sa.Column('iex_v2', sa.Float()),
        sa.Column('tipo', sa.String(5)),
        sa.Column('elasticidad_mx', sa.String(10)),
        sa.Column('beta_eloundou', sa.Float()),
        sa.Column('uso_aei_pct', sa.Float()),
        sa.Column('fecha_dataset', sa.Date()),
        sa.Column('fecha_carga', sa.DateTime(timezone=True)),
    )
    op.create_table(
        'carrera_soc_map',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('carrera_id', sa.String(36),
                  sa.ForeignKey('carreras.id'), nullable=False),
        sa.Column('soc_code', sa.String(10), nullable=False),
        sa.Column('peso', sa.Float(), nullable=False, server_default='1.0'),
        sa.Column('es_aproximacion', sa.Boolean(), nullable=False,
                  server_default=sa.true()),
        sa.Column('fuente', sa.String(50)),
        sa.Column('updated_at', sa.DateTime(timezone=True)),
        sa.UniqueConstraint('carrera_id', 'soc_code', name='uq_carrera_soc'),
    )
    op.create_index('idx_carrera_soc_carrera', 'carrera_soc_map', ['carrera_id'])


def downgrade() -> None:
    op.drop_index('idx_carrera_soc_carrera', table_name='carrera_soc_map')
    op.drop_table('carrera_soc_map')
    op.drop_table('exposicion_iex')

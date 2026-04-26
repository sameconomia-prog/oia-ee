"""p1_predicciones_kpi

Revision ID: p1pred001
Revises: p8radar001
Create Date: 2026-04-26

"""
from alembic import op
import sqlalchemy as sa

revision = 'p1pred001'
down_revision = 'p8radar001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'predicciones_kpi',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('entidad_tipo', sa.String(20), nullable=False),
        sa.Column('entidad_id', sa.String(36), nullable=False),
        sa.Column('kpi_nombre', sa.String(10), nullable=False),
        sa.Column('horizonte_años', sa.Integer(), nullable=False),
        sa.Column('fecha_prediccion', sa.Date(), nullable=False),
        sa.Column('valor_predicho', sa.Float(), nullable=False),
        sa.Column('ci_80_lower', sa.Float()),
        sa.Column('ci_80_upper', sa.Float()),
        sa.Column('ci_95_lower', sa.Float()),
        sa.Column('ci_95_upper', sa.Float()),
        sa.Column('modelo_version', sa.String(20), nullable=False),
        sa.Column('fecha_generacion', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('idx_pred_entidad_kpi', 'predicciones_kpi',
                    ['entidad_tipo', 'entidad_id', 'kpi_nombre'])


def downgrade() -> None:
    op.drop_index('idx_pred_entidad_kpi', table_name='predicciones_kpi')
    op.drop_table('predicciones_kpi')

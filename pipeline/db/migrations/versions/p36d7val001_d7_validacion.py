"""p36_d7_validacion — pares señal noticias vs vacantes reales (alerta #4)

Revision ID: p36d7val001
Revises: p35fa001
Create Date: 2026-06-12

"""
from alembic import op
import sqlalchemy as sa

revision = 'p36d7val001'
down_revision = 'p35fa001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'd7_validacion_snapshot',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('fecha', sa.Date(), nullable=False),
        sa.Column('sector', sa.String(100), nullable=False),
        sa.Column('noticias_7d', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('noticias_30d', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('vacantes_30d', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('isn_global', sa.Float()),
        sa.Column('vdm_global', sa.Float()),
        sa.Column('d7_score_global', sa.Float()),
        sa.Column('created_at', sa.DateTime(timezone=True)),
        sa.UniqueConstraint('fecha', 'sector', name='uq_d7val_fecha_sector'),
    )


def downgrade() -> None:
    op.drop_table('d7_validacion_snapshot')

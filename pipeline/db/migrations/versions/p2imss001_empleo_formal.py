"""p2a_empleo_formal_imss

Revision ID: p2imss001
Revises: p1pred001
Create Date: 2026-04-27

"""
from alembic import op
import sqlalchemy as sa

revision = 'p2imss001'
down_revision = 'p1pred001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'empleo_formal_imss',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('estado', sa.String(100), nullable=False),
        sa.Column('sector_scian', sa.String(10), nullable=False),
        sa.Column('sector_nombre', sa.String(200)),
        sa.Column('anio', sa.Integer(), nullable=False),
        sa.Column('mes', sa.Integer(), nullable=False),
        sa.Column('trabajadores', sa.Integer(), nullable=False),
        sa.Column('fecha_corte', sa.Date()),
        sa.UniqueConstraint('estado', 'sector_scian', 'anio', 'mes',
                            name='uq_imss_estado_sector_periodo'),
    )
    op.create_index('idx_imss_estado_periodo', 'empleo_formal_imss',
                    ['estado', 'anio', 'mes'])


def downgrade() -> None:
    op.drop_index('idx_imss_estado_periodo', table_name='empleo_formal_imss')
    op.drop_table('empleo_formal_imss')

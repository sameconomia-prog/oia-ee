"""p34_contexto_mx — perfil del empleo MX por ocupación (módulos M4/M7 v0)

Revision ID: p34ctxmx001
Revises: p33costoia001
Create Date: 2026-06-11

"""
from alembic import op
import sqlalchemy as sa

revision = 'p34ctxmx001'
down_revision = 'p33costoia001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'contexto_ocupacion_mx',
        sa.Column('soc_code', sa.String(10), primary_key=True),
        sa.Column('empleo_mx', sa.Integer()),
        sa.Column('ingreso_mensual_mxn', sa.Float()),
        sa.Column('pct_informalidad', sa.Float()),
        sa.Column('pct_mujeres', sa.Float()),
        sa.Column('edad_mediana', sa.Float()),
        sa.Column('escolaridad_anios', sa.Float()),
        sa.Column('pct_rural', sa.Float()),
        sa.Column('top_entidades', sa.Text()),
        sa.Column('fecha_carga', sa.DateTime(timezone=True)),
    )


def downgrade() -> None:
    op.drop_table('contexto_ocupacion_mx')

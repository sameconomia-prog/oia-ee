"""P10: tabla solicitudes_pertinencia

Revision ID: p10pertinencia001
Revises: p3apikey001
Create Date: 2026-04-29
"""
from alembic import op
import sqlalchemy as sa

revision = 'p10pertinencia001'
down_revision = 'p3apikey001'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'solicitudes_pertinencia',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('nombre_contacto', sa.String(200), nullable=False),
        sa.Column('email_contacto', sa.String(200), nullable=False),
        sa.Column('ies_nombre', sa.String(300), nullable=False),
        sa.Column('carrera_nombre', sa.String(300), nullable=False),
        sa.Column('mensaje', sa.Text, nullable=True),
        sa.Column('estado', sa.String(30), nullable=False, server_default='pendiente'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade():
    op.drop_table('solicitudes_pertinencia')

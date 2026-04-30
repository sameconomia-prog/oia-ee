"""P12: tabla white-label config

Revision ID: p12whitelabel001
Revises: p11siia001
Create Date: 2026-04-30
"""
from alembic import op
import sqlalchemy as sa

revision = 'p12whitelabel001'
down_revision = 'p11siia001'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'whitelabel_config',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('ies_id', sa.String(36), nullable=False, unique=True),
        sa.Column('dominio', sa.String(253), nullable=True, unique=True),
        sa.Column('nombre_app', sa.String(100), nullable=True),
        sa.Column('logo_url', sa.Text, nullable=True),
        sa.Column('color_primario', sa.String(7), nullable=True),
        sa.Column('color_acento', sa.String(7), nullable=True),
        sa.Column('footer_texto', sa.Text, nullable=True),
        sa.Column('activo', sa.Boolean, server_default='true'),
        sa.Column('creado_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('actualizado_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade():
    op.drop_table('whitelabel_config')

"""add_contactos_table

Revision ID: 5113de86f76d
Revises: p28leads001
Create Date: 2026-04-30 10:44:17.661374

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '5113de86f76d'
down_revision: Union[str, None] = 'p28leads001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'contactos',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tipo', sa.String(20), nullable=False),
        sa.Column('nombre', sa.String(200), nullable=False),
        sa.Column('cargo', sa.String(100), nullable=True),
        sa.Column('institucion', sa.String(300), nullable=False),
        sa.Column('email', sa.String(200), nullable=False),
        sa.Column('area_interes', sa.String(50), nullable=True),
        sa.Column('mensaje', sa.Text(), nullable=True),
        sa.Column('estado', sa.String(30), nullable=False, server_default='nuevo'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('idx_contactos_email', 'contactos', ['email'])
    op.create_index('idx_contactos_estado', 'contactos', ['estado'])


def downgrade() -> None:
    op.drop_index('idx_contactos_estado', table_name='contactos')
    op.drop_index('idx_contactos_email', table_name='contactos')
    op.drop_table('contactos')

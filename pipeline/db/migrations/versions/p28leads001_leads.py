"""p28_leads

Revision ID: p28leads001
Revises: p3apikey001
Create Date: 2026-04-30

"""
from alembic import op
import sqlalchemy as sa

revision = 'p28leads001'
down_revision = 'p12whitelabel001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'leads',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('nombre', sa.String(200), nullable=False),
        sa.Column('cargo', sa.String(100), nullable=True),
        sa.Column('ies_nombre', sa.String(300), nullable=False),
        sa.Column('email', sa.String(200), nullable=False),
        sa.Column('telefono', sa.String(30), nullable=True),
        sa.Column('mensaje', sa.Text(), nullable=True),
        sa.Column('origen', sa.String(50), nullable=False, server_default='demo'),
        sa.Column('estado', sa.String(30), nullable=False, server_default='nuevo'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )
    op.create_index('idx_leads_estado', 'leads', ['estado'])
    op.create_index('idx_leads_email', 'leads', ['email'])


def downgrade() -> None:
    op.drop_index('idx_leads_email', table_name='leads')
    op.drop_index('idx_leads_estado', table_name='leads')
    op.drop_table('leads')

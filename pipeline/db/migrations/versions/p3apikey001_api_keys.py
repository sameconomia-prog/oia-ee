"""p3_api_keys

Revision ID: p3apikey001
Revises: p2enoe001
Create Date: 2026-04-27

"""
from alembic import op
import sqlalchemy as sa

revision = 'p3apikey001'
down_revision = 'p2enoe001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'api_key',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('key_hash', sa.String(64), nullable=False),
        sa.Column('key_prefix', sa.String(8), nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('email', sa.String(200), nullable=False),
        sa.Column('tier', sa.String(20), nullable=False),
        sa.Column('expires_at', sa.Date(), nullable=True),
        sa.Column('revoked', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.UniqueConstraint('key_hash', name='uq_apikey_hash'),
    )
    op.create_index('idx_apikey_hash', 'api_key', ['key_hash'])


def downgrade() -> None:
    op.drop_index('idx_apikey_hash', table_name='api_key')
    op.drop_table('api_key')

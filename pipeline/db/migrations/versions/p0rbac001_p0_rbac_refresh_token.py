"""p0_rbac_refresh_token

Revision ID: p0rbac001
Revises: b71d19fdc6ce
Create Date: 2026-04-25

"""
from alembic import op
import sqlalchemy as sa

revision = 'p0rbac001'
down_revision = 'b71d19fdc6ce'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('usuarios', sa.Column('rol', sa.String(20), nullable=False, server_default='viewer'))
    op.create_table(
        'refresh_tokens',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('usuario_id', sa.String(36), sa.ForeignKey('usuarios.id'), nullable=False),
        sa.Column('token', sa.String(255), unique=True, nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('revocado', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table('refresh_tokens')
    op.drop_column('usuarios', 'rol')

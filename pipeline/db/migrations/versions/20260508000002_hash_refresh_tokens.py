"""F0.2a — hash refresh tokens (rename token → token_hash, purge plaintext)

Revision ID: 20260508000002
Revises: 20260508000001
Create Date: 2026-05-08

Notas:
- Los refresh tokens existentes se purgan (plaintext, no recuperables como hash sin el original).
- Usuarios activos deberán re-login. Aceptable: refresh tokens son sesiones, no datos persistentes.
"""
from alembic import op
import sqlalchemy as sa


revision = '20260508000002'
down_revision = '20260508000001'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    dialect = bind.dialect.name

    # 1. Purgar plaintext existentes
    op.execute("DELETE FROM refresh_tokens")

    # 2. Rename token → token_hash y reduce longitud a 64 (SHA-256 hex)
    if dialect == 'sqlite':
        with op.batch_alter_table('refresh_tokens') as batch:
            batch.alter_column('token', new_column_name='token_hash', existing_type=sa.String(255), type_=sa.String(64))
    else:
        op.alter_column('refresh_tokens', 'token', new_column_name='token_hash', existing_type=sa.String(255), type_=sa.String(64))


def downgrade():
    bind = op.get_bind()
    dialect = bind.dialect.name

    op.execute("DELETE FROM refresh_tokens")

    if dialect == 'sqlite':
        with op.batch_alter_table('refresh_tokens') as batch:
            batch.alter_column('token_hash', new_column_name='token', existing_type=sa.String(64), type_=sa.String(255))
    else:
        op.alter_column('refresh_tokens', 'token_hash', new_column_name='token', existing_type=sa.String(64), type_=sa.String(255))

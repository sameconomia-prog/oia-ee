"""F0.4d — add url column + unique(fuente, url) to vacantes

Revision ID: 20260508000001
Revises: 20260501184059
Create Date: 2026-05-08
"""
from alembic import op
import sqlalchemy as sa


revision = '20260508000001'
down_revision = '20260501184059'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    dialect = bind.dialect.name

    op.add_column('vacantes', sa.Column('url', sa.String(500), nullable=True))

    # Backfill: OCC históricamente guardaba URL en raw_json
    op.execute("UPDATE vacantes SET url = raw_json WHERE fuente = 'occ' AND url IS NULL")

    # Unique constraint (fuente, url). NULLs no colisionan en Postgres ni SQLite.
    if dialect == 'sqlite':
        # SQLite no permite ALTER ADD CONSTRAINT directo; usar batch
        with op.batch_alter_table('vacantes') as batch:
            batch.create_unique_constraint('uq_vacante_fuente_url', ['fuente', 'url'])
    else:
        op.create_unique_constraint('uq_vacante_fuente_url', 'vacantes', ['fuente', 'url'])


def downgrade():
    bind = op.get_bind()
    dialect = bind.dialect.name

    if dialect == 'sqlite':
        with op.batch_alter_table('vacantes') as batch:
            batch.drop_constraint('uq_vacante_fuente_url', type_='unique')
            batch.drop_column('url')
    else:
        op.drop_constraint('uq_vacante_fuente_url', 'vacantes', type_='unique')
        op.drop_column('vacantes', 'url')

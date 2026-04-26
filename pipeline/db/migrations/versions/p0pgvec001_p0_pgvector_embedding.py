"""p0_pgvector_embedding

Revision ID: p0pgvec001
Revises: p0rbac001
Create Date: 2026-04-26
"""
from alembic import op
import sqlalchemy as sa

revision = 'p0pgvec001'
down_revision = 'p0rbac001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.add_column('noticias', sa.Column('embedding', sa.Text(), nullable=True,
                  comment='pgvector vector(1536) — tipo Text en migración, convertir manualmente si se requiere'))
    # TODO(p1-migration): In production PostgreSQL, run manually:
    #   ALTER TABLE noticias ALTER COLUMN embedding TYPE vector(1536)
    #   USING embedding::vector(1536);
    # The ORM model uses Vector(1536) but this migration uses Text to stay SQLite-safe.
    # Alembic autogenerate will detect drift — add a dedicated P1 migration to fix the type.


def downgrade() -> None:
    op.drop_column('noticias', 'embedding')

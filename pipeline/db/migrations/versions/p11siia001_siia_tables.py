"""P11: tablas integración SIIA

Revision ID: p11siia001
Revises: p10pertinencia001
Create Date: 2026-04-29
"""
from alembic import op
import sqlalchemy as sa

revision = 'p11siia001'
down_revision = 'p10pertinencia001'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'siia_matricula',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('ies_id', sa.String(36), nullable=False),
        sa.Column('carrera_id', sa.String(36), nullable=True),
        sa.Column('ciclo', sa.String(10), nullable=False),
        sa.Column('nivel', sa.String(30), nullable=True),
        sa.Column('matricula', sa.Integer, nullable=True),
        sa.Column('egresados', sa.Integer, nullable=True),
        sa.Column('titulados', sa.Integer, nullable=True),
        sa.Column('costo_anual_mxn', sa.Integer, nullable=True),
        sa.Column('cve_sep', sa.String(20), nullable=True),
        sa.Column('payload_raw', sa.Text, nullable=True),
        sa.Column('recibido_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('procesado', sa.Boolean, server_default='false'),
        sa.UniqueConstraint('ies_id', 'carrera_id', 'ciclo', name='uq_siia_matricula_ies_carrera_ciclo'),
    )
    op.create_table(
        'siia_tokens',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('ies_id', sa.String(36), nullable=False, unique=True),
        sa.Column('token_hash', sa.String(64), nullable=False),
        sa.Column('activo', sa.Boolean, server_default='true'),
        sa.Column('creado_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('ultimo_uso', sa.DateTime(timezone=True), nullable=True),
    )


def downgrade():
    op.drop_table('siia_matricula')
    op.drop_table('siia_tokens')

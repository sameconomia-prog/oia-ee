"""p8_radar_tables

Revision ID: p8radar001
Revises: p0pgvec001
Create Date: 2026-04-26

"""
from alembic import op
import sqlalchemy as sa

revision = 'p8radar001'
down_revision = 'p0pgvec001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    dialect = bind.dialect.name

    # JSON type: JSONB on PostgreSQL, JSON on SQLite/others
    json_type = sa.dialects.postgresql.JSONB() if dialect == "postgresql" else sa.JSON()

    op.create_table(
        'eventos_ia_despidos',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('empresa', sa.Text(), nullable=False),
        sa.Column('sector', sa.String(100)),
        sa.Column('pais', sa.String(2)),
        sa.Column('fecha_anuncio', sa.Date(), nullable=False),
        sa.Column('fecha_captura', sa.Date()),
        sa.Column('numero_despidos', sa.Integer()),
        sa.Column('rango_min_despidos', sa.Integer()),
        sa.Column('rango_max_despidos', sa.Integer()),
        sa.Column('salario_promedio_usd', sa.Float()),
        sa.Column('ahorro_anual_usd', sa.Float()),
        sa.Column('ia_tecnologia', sa.String(200)),
        sa.Column('area_reemplazada', sa.String(200)),
        sa.Column('porcentaje_fuerza_laboral', sa.Float()),
        sa.Column('es_reemplazo_total', sa.Boolean()),
        sa.Column('fuente_url', sa.Text(), nullable=False),
        sa.Column('fuente_nombre', sa.String(100)),
        sa.Column('confiabilidad', sa.String(10), nullable=False),
        sa.Column('resumen_haiku', sa.Text()),
        sa.Column('revocado', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('idx_despidos_pais_fecha', 'eventos_ia_despidos', ['pais', 'fecha_anuncio'])
    op.create_index('idx_despidos_sector', 'eventos_ia_despidos', ['sector'])

    op.create_table(
        'eventos_ia_empleos',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('empresa', sa.Text(), nullable=False),
        sa.Column('sector', sa.String(100)),
        sa.Column('pais', sa.String(2)),
        sa.Column('fecha_anuncio', sa.Date(), nullable=False),
        sa.Column('fecha_captura', sa.Date()),
        sa.Column('numero_empleos', sa.Integer()),
        sa.Column('tipo_contrato', sa.String(20)),
        sa.Column('titulo_puesto', sa.String(200)),
        sa.Column('habilidades_requeridas', json_type),
        sa.Column('salario_min_usd', sa.Float()),
        sa.Column('salario_max_usd', sa.Float()),
        sa.Column('ia_tecnologia_usada', sa.String(200)),
        sa.Column('fuente_url', sa.Text(), nullable=False),
        sa.Column('fuente_nombre', sa.String(100)),
        sa.Column('confiabilidad', sa.String(10), nullable=False),
        sa.Column('resumen_haiku', sa.Text()),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('idx_empleos_pais_fecha', 'eventos_ia_empleos', ['pais', 'fecha_anuncio'])

    op.create_table(
        'skills_emergentes',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('skill', sa.String(200), unique=True, nullable=False),
        sa.Column('categoria', sa.String(20)),
        sa.Column('menciones_30d', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('tendencia_90d', sa.String(15)),
        sa.Column('velocidad_crecimiento_pct', sa.Float()),
        sa.Column('sectores_demandantes', json_type),
        sa.Column('paises_demandantes', json_type),
        sa.Column('salario_premium_pct', sa.Float()),
        sa.Column('primera_mencion_fecha', sa.Date()),
        sa.Column('ultima_mencion_fecha', sa.Date()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table('skills_emergentes')
    op.drop_index('idx_empleos_pais_fecha', table_name='eventos_ia_empleos')
    op.drop_table('eventos_ia_empleos')
    op.drop_index('idx_despidos_sector', table_name='eventos_ia_despidos')
    op.drop_index('idx_despidos_pais_fecha', table_name='eventos_ia_despidos')
    op.drop_table('eventos_ia_despidos')

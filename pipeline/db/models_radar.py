"""Modelos SQLAlchemy para el Radar de Impacto IA (P8)."""
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, Integer, Float, Boolean, Date,
    DateTime, Index, JSON
)
from pipeline.db.models import Base, _uuid


class EventoIADespido(Base):
    __tablename__ = "eventos_ia_despidos"

    id                        = Column(String(36), primary_key=True, default=_uuid)
    empresa                   = Column(Text, nullable=False)
    sector                    = Column(String(100))
    pais                      = Column(String(2))
    fecha_anuncio             = Column(Date, nullable=False)
    fecha_captura             = Column(Date, default=datetime.utcnow)
    numero_despidos           = Column(Integer)
    rango_min_despidos        = Column(Integer)
    rango_max_despidos        = Column(Integer)
    salario_promedio_usd      = Column(Float)
    ahorro_anual_usd          = Column(Float)
    ia_tecnologia             = Column(String(200))
    area_reemplazada          = Column(String(200))
    porcentaje_fuerza_laboral = Column(Float)
    es_reemplazo_total        = Column(Boolean)
    fuente_url                = Column(Text, nullable=False)
    fuente_nombre             = Column(String(100))
    confiabilidad             = Column(String(10), nullable=False)
    resumen_haiku             = Column(Text)
    revocado                  = Column(Boolean, default=False)
    created_at                = Column(DateTime(timezone=True), default=datetime.utcnow)

    __table_args__ = (
        Index("idx_despidos_pais_fecha", "pais", "fecha_anuncio"),
        Index("idx_despidos_sector", "sector"),
    )

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if self.numero_despidos and self.salario_promedio_usd and not self.ahorro_anual_usd:
            self.ahorro_anual_usd = self.numero_despidos * self.salario_promedio_usd * 12


class EventoIAEmpleo(Base):
    __tablename__ = "eventos_ia_empleos"

    id                     = Column(String(36), primary_key=True, default=_uuid)
    empresa                = Column(Text, nullable=False)
    sector                 = Column(String(100))
    pais                   = Column(String(2))
    fecha_anuncio          = Column(Date, nullable=False)
    fecha_captura          = Column(Date, default=datetime.utcnow)
    numero_empleos         = Column(Integer)
    tipo_contrato          = Column(String(20))
    titulo_puesto          = Column(String(200))
    habilidades_requeridas = Column(JSON)
    salario_min_usd        = Column(Float)
    salario_max_usd        = Column(Float)
    ia_tecnologia_usada    = Column(String(200))
    fuente_url             = Column(Text, nullable=False)
    fuente_nombre          = Column(String(100))
    confiabilidad          = Column(String(10), nullable=False)
    resumen_haiku          = Column(Text)
    created_at             = Column(DateTime(timezone=True), default=datetime.utcnow)

    __table_args__ = (
        Index("idx_empleos_pais_fecha", "pais", "fecha_anuncio"),
    )


class SkillEmergente(Base):
    __tablename__ = "skills_emergentes"

    id                        = Column(String(36), primary_key=True, default=_uuid)
    skill                     = Column(String(200), unique=True, nullable=False)
    categoria                 = Column(String(20))
    menciones_30d             = Column(Integer, default=0)
    tendencia_90d             = Column(String(15))
    velocidad_crecimiento_pct = Column(Float)
    sectores_demandantes      = Column(JSON)
    paises_demandantes        = Column(JSON)
    salario_premium_pct       = Column(Float)
    primera_mencion_fecha     = Column(Date)
    ultima_mencion_fecha      = Column(Date)
    updated_at                = Column(DateTime(timezone=True), default=datetime.utcnow)

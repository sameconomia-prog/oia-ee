"""Modelos del puente ciencia→producto: datasets IEX del repo oia-ee-research.

La plataforma CONSUME estos datos (cargados por pipeline/loaders/iex_loader.py);
nunca recalcula el IEX. La metodología vive en ~/Documents/oia-ee-research.
"""
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, Float, Boolean, Date, DateTime,
    ForeignKey, UniqueConstraint, Index,
)
from pipeline.db.models import Base, _uuid


class ExposicionIEX(Base):
    """Exposición a IA por ocupación SOC — dataset publicado por oia-ee-research.

    iex_v1: índice 0-10 ponderado por importancia O*NET (outputs/iex_ocupacion.csv).
    iex_v2: v1 con compuerta de viabilidad (tabla iex_ocupacion_v2 de db/tesis.db).
    tipo: clasificación A/B/C (sustitución/complementariedad/impacto bajo), versión v2.
    elasticidad_mx: E-Alta/E-Media/E-Baja aprobada con evidencia (docs/elasticidad_mx.csv).
    beta_eloundou: β ponderada por importancia (outputs/exposicion_baseline.csv).
    uso_aei_pct: % de conversaciones Claude.ai de las tareas de la ocupación (AEI).
    """
    __tablename__ = "exposicion_iex"

    soc_code       = Column(String(10), primary_key=True)   # SOC 2018, formato '43-3031'
    titulo         = Column(Text)
    iex_v1         = Column(Float)
    iex_v2         = Column(Float)
    tipo           = Column(String(5))
    elasticidad_mx = Column(String(10))
    beta_eloundou  = Column(Float)
    uso_aei_pct    = Column(Float)
    fecha_dataset  = Column(Date)
    fecha_carga    = Column(DateTime(timezone=True), default=datetime.utcnow)
    # Dimensiones D1-D7 del IEX agregadas a ocupación (0-10), export descriptivo
    # del repo hermano (outputs/iex_dimensiones_ocupacion.csv). Transparencia:
    # dim_d7 es la TRC (rutinariedad cognitiva) del panel — ya ponderada DENTRO
    # del IEX, se expone como explicación, nunca se re-suma a la fórmula.
    dim_d1         = Column(Float)
    dim_d2         = Column(Float)
    dim_d3         = Column(Float)
    dim_d4         = Column(Float)
    dim_d5         = Column(Float)
    dim_d6         = Column(Float)
    dim_d7         = Column(Float)


class CarreraSocMap(Base):
    """Crosswalk carrera→ocupación SOC para consumir exposicion_iex.

    Seed automático: truncado de Carrera.onet_codes_relacionados (O*NET 8 dígitos
    → SOC 6 dígitos). es_aproximacion=True marca filas del seed; el superadmin
    puede corregir/añadir vía /admin/soc-map (es_aproximacion=False en ediciones).
    """
    __tablename__ = "carrera_soc_map"

    id              = Column(String(36), primary_key=True, default=_uuid)
    carrera_id      = Column(String(36), ForeignKey("carreras.id"), nullable=False)
    soc_code        = Column(String(10), nullable=False)
    peso            = Column(Float, nullable=False, default=1.0)
    es_aproximacion = Column(Boolean, nullable=False, default=True)
    fuente          = Column(String(50), default="seed_onet_truncado")
    updated_at      = Column(DateTime(timezone=True), default=datetime.utcnow,
                             onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("carrera_id", "soc_code", name="uq_carrera_soc"),
        Index("idx_carrera_soc_carrera", "carrera_id"),
    )

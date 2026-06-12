"""Modelos del puente ciencia→producto: datasets IEX del repo oia-ee-research.

La plataforma CONSUME estos datos (cargados por pipeline/loaders/iex_loader.py);
nunca recalcula el IEX. La metodología vive en ~/Documents/oia-ee-research.
"""
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Text, Float, Boolean, Date, DateTime, Integer,
    ForeignKey, UniqueConstraint, Index,
)
from pipeline.db.models import Base, _uuid


def _now_utc():
    return datetime.now(timezone.utc)


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
    fecha_carga    = Column(DateTime(timezone=True), default=_now_utc)
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


class ContextoOcupacionMX(Base):
    """Perfil del empleo mexicano por ocupación SOC (módulos M4/M7 v0).

    Dataset de la tesis (tesis.db::ocupaciones_mx, ENOE 2026-T1 SDEM∩COE1):
    variables distributivas y de equidad ya validadas en las fichas
    distributivas del repo hermano. La plataforma consume, no recalcula.
    """
    __tablename__ = "contexto_ocupacion_mx"

    soc_code            = Column(String(10), primary_key=True)
    empleo_mx           = Column(Integer)
    ingreso_mensual_mxn = Column(Float)    # mediano
    pct_informalidad    = Column(Float)
    pct_mujeres         = Column(Float)
    edad_mediana        = Column(Float)
    escolaridad_anios   = Column(Float)
    pct_rural           = Column(Float)    # localidades <15k hab
    top_entidades       = Column(Text)
    fecha_carga         = Column(DateTime(timezone=True), default=_now_utc)


class CostoIAOcupacion(Base):
    """Comparativo coste IA vs humano por ocupación (módulo M3 del panel).

    Cálculo de PRODUCTO (no del repo de investigación): salario mediano ENOE
    (tesis.db::ocupaciones_mx) vs coste estimado de una hora cognitiva
    equivalente con un modelo Claude de referencia. Los supuestos viajan en
    la columna `supuestos` (JSON) para auditoría.
    """
    __tablename__ = "costo_ia_ocupacion"

    soc_code          = Column(String(10), primary_key=True)
    salario_mes_mxn   = Column(Float)
    salario_hora_mxn  = Column(Float)
    costo_ia_hora_mxn = Column(Float)
    ratio_costo       = Column(Float)    # costo_ia / costo_humano; <1 = IA más barata
    modelo_ref        = Column(String(40))
    supuestos         = Column(Text)     # JSON con tokens/hora, FX, fecha pricing
    fecha_calculo     = Column(DateTime(timezone=True), default=_now_utc)


class FASectorial(Base):
    """Fricción de adopción por grupo SOC mayor (2 dígitos).

    Sustituye la constante FA_DEFAULT en el IVA v2 cuando hay fila para el
    grupo (fallback a la constante si no). Seed según
    docs/estrategia/propuesta_fa_sectorial_2026-06.md (aprobada 2026-06-11);
    es_aproximacion=True marca el seed — editable por superadmin vía
    /admin/fa-sectorial, las ediciones nunca son pisadas por el re-seed.
    """
    __tablename__ = "fa_sectorial"

    grupo_soc       = Column(String(2), primary_key=True)
    fa              = Column(Float, nullable=False)
    justificacion   = Column(Text)
    fuente          = Column(String(50), default="seed_propuesta_2026-06")
    es_aproximacion = Column(Boolean, nullable=False, default=True)
    updated_at      = Column(DateTime(timezone=True), default=_now_utc,
                             onupdate=_now_utc)


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
    updated_at      = Column(DateTime(timezone=True), default=_now_utc,
                             onupdate=_now_utc)

    __table_args__ = (
        UniqueConstraint("carrera_id", "soc_code", name="uq_carrera_soc"),
        Index("idx_carrera_soc_carrera", "carrera_id"),
    )

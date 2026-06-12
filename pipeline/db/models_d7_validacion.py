"""Pares señal-mediática → vacantes reales para validar el D7 (alerta #4 del panel).

Cada fila congela, por (fecha, sector), el volumen de noticias (señal) y las
vacantes OCC de los últimos 30 días (baseline). 12 meses después,
`evaluar_validacion_d7` compara la señal contra las vacantes realizadas.
Diseño: docs/estrategia/diseno_validacion_d7_2026-06.md
"""
from datetime import datetime, timezone

from sqlalchemy import Column, Date, DateTime, Float, Integer, String, UniqueConstraint

from pipeline.db.models import Base


def _now_utc():
    return datetime.now(timezone.utc)


class D7ValidacionSnapshot(Base):
    __tablename__ = "d7_validacion_snapshot"

    id           = Column(Integer, primary_key=True, autoincrement=True)
    fecha        = Column(Date, nullable=False)
    sector       = Column(String(100), nullable=False)
    noticias_7d  = Column(Integer, nullable=False, default=0)
    noticias_30d = Column(Integer, nullable=False, default=0)
    vacantes_30d = Column(Integer, nullable=False, default=0)
    isn_global   = Column(Float)
    vdm_global   = Column(Float)
    d7_score_global = Column(Float)
    created_at   = Column(DateTime(timezone=True), default=_now_utc)

    __table_args__ = (
        UniqueConstraint("fecha", "sector", name="uq_d7val_fecha_sector"),
    )

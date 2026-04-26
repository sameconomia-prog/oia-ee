from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, Date, DateTime, Index
from pipeline.db.models import Base, _uuid


class PrediccionKpi(Base):
    __tablename__ = "predicciones_kpi"

    id               = Column(String(36), primary_key=True, default=_uuid)
    entidad_tipo     = Column(String(20), nullable=False)
    entidad_id       = Column(String(36), nullable=False)
    kpi_nombre       = Column(String(10), nullable=False)
    horizonte_años   = Column(Integer, nullable=False)
    fecha_prediccion = Column(Date, nullable=False)
    valor_predicho   = Column(Float, nullable=False)
    ci_80_lower      = Column(Float)
    ci_80_upper      = Column(Float)
    ci_95_lower      = Column(Float)
    ci_95_upper      = Column(Float)
    modelo_version   = Column(String(20), nullable=False)
    fecha_generacion = Column(DateTime(timezone=True), default=datetime.utcnow)

    __table_args__ = (
        Index("idx_pred_entidad_kpi", "entidad_tipo", "entidad_id", "kpi_nombre"),
    )

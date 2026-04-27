from sqlalchemy import Column, String, Integer, Float, Date, UniqueConstraint, Index
from pipeline.db.models import Base, _uuid


class IndicadorENOE(Base):
    __tablename__ = "indicador_enoe"

    id               = Column(String(36), primary_key=True, default=_uuid)
    estado           = Column(String(100), nullable=False)
    anio             = Column(Integer, nullable=False)
    trimestre        = Column(Integer, nullable=False)
    tasa_desempleo   = Column(Float)
    poblacion_ocupada = Column(Integer)
    fecha_corte      = Column(Date)

    __table_args__ = (
        UniqueConstraint("estado", "anio", "trimestre",
                         name="uq_enoe_estado_periodo"),
        Index("idx_enoe_estado_periodo", "estado", "anio", "trimestre"),
    )

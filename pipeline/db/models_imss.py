# pipeline/db/models_imss.py
from sqlalchemy import Column, String, Integer, Date, UniqueConstraint, Index
from pipeline.db.models import Base, _uuid


class EmpleoFormalIMSS(Base):
    __tablename__ = "empleo_formal_imss"

    id            = Column(String(36), primary_key=True, default=_uuid)
    estado        = Column(String(100), nullable=False)
    sector_scian  = Column(String(10), nullable=False)
    sector_nombre = Column(String(200))
    anio          = Column(Integer, nullable=False)
    mes           = Column(Integer, nullable=False)
    trabajadores  = Column(Integer, nullable=False)
    fecha_corte   = Column(Date)

    __table_args__ = (
        UniqueConstraint("estado", "sector_scian", "anio", "mes",
                         name="uq_imss_estado_sector_periodo"),
        Index("idx_imss_estado_periodo", "estado", "anio", "mes"),
    )

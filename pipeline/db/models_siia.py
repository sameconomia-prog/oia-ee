# pipeline/db/models_siia.py
from datetime import datetime
from sqlalchemy import Column, String, Integer, SmallInteger, Numeric, DateTime, Text, Boolean, UniqueConstraint
from pipeline.db.models import Base


def _uuid():
    import uuid
    return str(uuid.uuid4())


class SiiaMatricula(Base):
    """Datos de matrícula enviados por IES vía webhook SIIA."""
    __tablename__ = "siia_matricula"
    id             = Column(String(36), primary_key=True, default=_uuid)
    ies_id         = Column(String(36), nullable=False)
    carrera_id     = Column(String(36), nullable=True)
    ciclo          = Column(String(10), nullable=False)
    nivel          = Column(String(30), nullable=True)
    matricula      = Column(Integer, nullable=True)
    egresados      = Column(Integer, nullable=True)
    titulados      = Column(Integer, nullable=True)
    costo_anual_mxn = Column(Integer, nullable=True)
    cve_sep        = Column(String(20), nullable=True)
    payload_raw    = Column(Text, nullable=True)
    recibido_at    = Column(DateTime(timezone=True), default=datetime.utcnow)
    procesado      = Column(Boolean, default=False)
    __table_args__ = (UniqueConstraint("ies_id", "carrera_id", "ciclo"),)


class SiiaToken(Base):
    """Token de autenticación para webhook SIIA por IES."""
    __tablename__ = "siia_tokens"
    id         = Column(String(36), primary_key=True, default=_uuid)
    ies_id     = Column(String(36), nullable=False, unique=True)
    token_hash = Column(String(64), nullable=False)
    activo     = Column(Boolean, default=True)
    creado_at  = Column(DateTime(timezone=True), default=datetime.utcnow)
    ultimo_uso = Column(DateTime(timezone=True), nullable=True)

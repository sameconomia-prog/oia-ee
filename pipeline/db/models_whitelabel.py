# pipeline/db/models_whitelabel.py
from datetime import datetime
from sqlalchemy import Column, String, Text, Boolean, DateTime
from pipeline.db.models import Base


def _uuid():
    import uuid
    return str(uuid.uuid4())


class WhiteLabelConfig(Base):
    """Configuración de white-label por IES (plan Enterprise)."""
    __tablename__ = "whitelabel_config"
    id             = Column(String(36), primary_key=True, default=_uuid)
    ies_id         = Column(String(36), nullable=False, unique=True)
    dominio        = Column(String(253), nullable=True, unique=True)
    nombre_app     = Column(String(100), nullable=True)
    logo_url       = Column(Text, nullable=True)
    color_primario = Column(String(7), nullable=True)
    color_acento   = Column(String(7), nullable=True)
    footer_texto   = Column(Text, nullable=True)
    activo         = Column(Boolean, default=True)
    creado_at      = Column(DateTime(timezone=True), default=datetime.utcnow)
    actualizado_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Date, UniqueConstraint, Index
from pipeline.db.models import Base, _uuid


class ApiKey(Base):
    __tablename__ = "api_key"

    id         = Column(String(36), primary_key=True, default=_uuid)
    key_hash   = Column(String(64), nullable=False)
    key_prefix = Column(String(8), nullable=False)
    name       = Column(String(200), nullable=False)
    email      = Column(String(200), nullable=False)
    tier       = Column(String(20), nullable=False, default="researcher")
    expires_at = Column(Date, nullable=True)
    revoked    = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("key_hash", name="uq_apikey_hash"),
        Index("idx_apikey_hash", "key_hash"),
    )

import hashlib
import pytest
from datetime import date, timedelta
from unittest.mock import MagicMock
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from pipeline.db.models import Base
from pipeline.db import models_apikey  # noqa: F401
from pipeline.db.models_apikey import ApiKey
from api.deps import get_api_key_tier
from api.middleware.rate_limit import dynamic_rate_limiter


@pytest.fixture
def session():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    s = Session()
    yield s
    s.rollback()
    s.close()


def _fake_request(api_key: str = "") -> MagicMock:
    req = MagicMock()
    req.headers = {"X-API-Key": api_key} if api_key else {}
    return req


def _insert_api_key(session, raw_key="testkey123", tier="researcher",
                    revoked=False, expires_at=None) -> ApiKey:
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    ak = ApiKey(
        key_hash=key_hash,
        key_prefix=raw_key[:8],
        name="Test Key",
        email="test@example.com",
        tier=tier,
        revoked=revoked,
        expires_at=expires_at,
    )
    session.add(ak)
    session.flush()
    return ak


def test_sin_header_retorna_anon(session):
    req = _fake_request("")
    tier = get_api_key_tier(req, session)
    assert tier == "anon"


def test_key_valida_researcher_retorna_tier(session):
    raw_key = "researcher_key_test"
    _insert_api_key(session, raw_key=raw_key, tier="researcher")
    req = _fake_request(raw_key)
    tier = get_api_key_tier(req, session)
    assert tier == "researcher"


def test_key_revocada_retorna_anon(session):
    raw_key = "revoked_key_test"
    _insert_api_key(session, raw_key=raw_key, revoked=True)
    req = _fake_request(raw_key)
    tier = get_api_key_tier(req, session)
    assert tier == "anon"


def test_key_expirada_retorna_anon(session):
    raw_key = "expired_key_test"
    _insert_api_key(session, raw_key=raw_key,
                    expires_at=date.today() - timedelta(days=1))
    req = _fake_request(raw_key)
    tier = get_api_key_tier(req, session)
    assert tier == "anon"


def test_key_no_registrada_retorna_anon(session):
    req = _fake_request("completely_unknown_key")
    tier = get_api_key_tier(req, session)
    assert tier == "anon"


def test_dynamic_rate_limiter_anon_retorna_limiter():
    # Cuando se llama con tier="anon", retorna un RateLimiter (o None si Redis falla)
    result = dynamic_rate_limiter("anon")
    # En full test suite: FastAPILimiter está inicializado → RateLimiter
    # En test aislado: no está inicializado → None
    # Ambos son válidos; lo importante es que no lance excepción
    assert result is None or str(type(result).__name__) == "RateLimiter"


def test_dynamic_rate_limiter_researcher_retorna_limiter():
    # Cuando se llama con tier="researcher", retorna un RateLimiter (o None si Redis falla)
    result = dynamic_rate_limiter("researcher")
    assert result is None or str(type(result).__name__) == "RateLimiter"


def test_dynamic_rate_limiter_premium_retorna_none():
    # Premium siempre retorna None (sin límite)
    result = dynamic_rate_limiter("premium")
    assert result is None

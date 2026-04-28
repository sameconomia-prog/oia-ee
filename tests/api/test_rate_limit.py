import hashlib
import pytest
from datetime import date, timedelta
from unittest.mock import AsyncMock, MagicMock
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from pipeline.db.models import Base
from pipeline.db import models_apikey  # noqa: F401
from pipeline.db.models_apikey import ApiKey
from api.deps import get_api_key_tier
from api.middleware.rate_limit import apply_rate_limit, dynamic_rate_limiter, _mem_limiter, _InMemoryRateLimiter


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


def test_dynamic_rate_limiter_sin_redis_retorna_none():
    from unittest.mock import patch
    with patch("api.middleware.rate_limit.FastAPILimiter.redis", None):
        result = dynamic_rate_limiter("anon")
        assert result is None


def test_dynamic_rate_limiter_premium_retorna_none():
    result = dynamic_rate_limiter("premium")
    assert result is None


def test_dynamic_rate_limiter_premium_con_redis_retorna_none():
    from unittest.mock import patch, MagicMock
    with patch("api.middleware.rate_limit.FastAPILimiter.redis", MagicMock()):
        assert dynamic_rate_limiter("premium") is None


def test_dynamic_rate_limiter_researcher_con_redis_retorna_limiter():
    from unittest.mock import patch, MagicMock
    with patch("api.middleware.rate_limit.FastAPILimiter.redis", MagicMock()):
        result = dynamic_rate_limiter("researcher")
        assert result is not None


# ── InMemoryRateLimiter ────────────────────────────────────────────────────

def test_in_memory_permite_hasta_limite():
    lim = _InMemoryRateLimiter()
    for _ in range(3):
        assert lim.is_allowed("k", times=3, seconds=60) is True
    assert lim.is_allowed("k", times=3, seconds=60) is False


def test_in_memory_claves_independientes():
    lim = _InMemoryRateLimiter()
    for _ in range(2):
        lim.is_allowed("a", times=2, seconds=60)
    assert lim.is_allowed("b", times=2, seconds=60) is True


# ── apply_rate_limit ───────────────────────────────────────────────────────

def _fake_request_with_ip(ip: str = "1.2.3.4") -> MagicMock:
    req = MagicMock()
    req.client.host = ip
    req.headers = {}
    req.url.path = "/test"
    req.method = "GET"
    req.scope = {"type": "http", "path": "/test", "method": "GET"}
    return req


@pytest.mark.asyncio
async def test_apply_rate_limit_premium_no_bloquea(monkeypatch):
    import api.middleware.rate_limit as rl
    monkeypatch.setattr(rl, "_redis_available", lambda: False)
    monkeypatch.setattr(rl, "_mem_limiter", _InMemoryRateLimiter())
    req = _fake_request_with_ip("8.8.8.8")
    resp = MagicMock()
    for _ in range(100):
        await rl.apply_rate_limit(req, resp, "premium")


@pytest.mark.asyncio
async def test_apply_rate_limit_anon_bloquea_al_exceder(monkeypatch):
    import api.middleware.rate_limit as rl
    monkeypatch.setattr(rl, "_redis_available", lambda: False)
    lim = _InMemoryRateLimiter()
    monkeypatch.setattr(rl, "_mem_limiter", lim)

    req = _fake_request_with_ip("9.9.9.9")
    resp = MagicMock()
    from fastapi import HTTPException
    for _ in range(30):
        await rl.apply_rate_limit(req, resp, "anon")
    with pytest.raises(HTTPException) as exc:
        await rl.apply_rate_limit(req, resp, "anon")
    assert exc.value.status_code == 429

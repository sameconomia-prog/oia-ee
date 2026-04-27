# tests/api/conftest.py
import sys
import os

# Ensure project root is on sys.path (needed when pytest collects this conftest first)
_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from pipeline.db.models import Base
from pipeline.db import models_imss   # noqa: F401 — registers tables with Base
from pipeline.db import models_enoe   # noqa: F401 — registers tables with Base
from pipeline.db import models_apikey # noqa: F401 — registers tables with Base
from api.main import app
from api.deps import get_db


@pytest.fixture(scope="session")
def test_engine():
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    return engine


@pytest.fixture
def db_session(test_engine):
    Session = sessionmaker(bind=test_engine)
    session = Session()
    yield session
    session.rollback()
    session.close()


@pytest.fixture
def client(db_session):
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def clear_kpis_cache():
    from api.routers.publico import _clear_kpis_cache
    _clear_kpis_cache()
    yield
    _clear_kpis_cache()


import uuid as _uuid_mod
from passlib.context import CryptContext as _CryptContext
from pipeline.db.models import IES, Usuario

_test_pwd_ctx = _CryptContext(schemes=["bcrypt"], deprecated="auto")


@pytest.fixture
def authed_client(client, db_session):
    """Client con JWT válido. Retorna (client, ies_id)."""
    unique_suffix = _uuid_mod.uuid4().hex[:8]
    ies = IES(nombre="IES Auth Fixture", nombre_corto="IAF")
    db_session.add(ies)
    db_session.flush()
    username = f"rector_{unique_suffix}"
    user = Usuario(
        username=username,
        hashed_password=_test_pwd_ctx.hash("fixture_pass"),
        ies_id=ies.id,
    )
    db_session.add(user)
    db_session.flush()

    resp = client.post("/auth/login", data={"username": username, "password": "fixture_pass"})
    assert resp.status_code == 200, f"Login falló en fixture: {resp.text}"
    token = resp.json()["access_token"]
    client.headers = {**client.headers, "Authorization": f"Bearer {token}"}
    return client, ies.id

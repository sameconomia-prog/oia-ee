"""Tests para GET /health — estados ok, degraded, down."""
import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from api.main import app
from api.deps import get_db, rate_limit_public
from pipeline.db.models import Base, PipelineRun

# Engine SQLite in-memory para tests
test_engine = create_engine(
    "sqlite+pysqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSession = sessionmaker(bind=test_engine)


async def noop_rate_limit() -> None:
    pass


def override_get_db():
    db = TestSession()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(test_engine)
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[rate_limit_public] = noop_rate_limit
    yield
    Base.metadata.drop_all(test_engine)
    app.dependency_overrides.clear()


@pytest.fixture
def client():
    return TestClient(app)


def _add_run(job_id: str, status: str, hours_ago: float = 0):
    db = TestSession()
    run = PipelineRun(
        job_id=job_id,
        ran_at=datetime.utcnow() - timedelta(hours=hours_ago),
        status=status,
        message="",
    )
    db.add(run)
    db.commit()
    db.close()


# --- Tests ---

def test_health_down_when_no_heartbeat(client):
    """Sin heartbeat: scheduler_alive=False → HTTP 503."""
    r = client.get("/health")
    assert r.status_code == 503
    data = r.json()
    assert data["status"] == "down"
    assert data["scheduler_alive"] is False


def test_health_down_when_heartbeat_stale(client):
    """Heartbeat con más de 1h: scheduler muerto → HTTP 503."""
    _add_run("_heartbeat", "ok", hours_ago=2)
    r = client.get("/health")
    assert r.status_code == 503
    assert r.json()["status"] == "down"


def test_health_ok_when_all_fresh(client):
    """Heartbeat reciente + todos los jobs frescos → HTTP 200 ok."""
    _add_run("_heartbeat", "ok", hours_ago=0.1)
    _add_run("news_scraper", "ok", hours_ago=1)
    _add_run("stps_loader", "ok", hours_ago=1)
    _add_run("kpi_snapshot", "ok", hours_ago=1)
    _add_run("resumen_semanal", "ok", hours_ago=1)
    _add_run("imss_loader", "ok", hours_ago=1)
    _add_run("enoe_loader", "ok", hours_ago=1)
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_health_degraded_when_job_stale(client):
    """Heartbeat reciente pero news_scraper estancado >8h → HTTP 200 degraded."""
    _add_run("_heartbeat", "ok", hours_ago=0.1)
    _add_run("news_scraper", "ok", hours_ago=10)  # supera umbral de 8h
    r = client.get("/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "degraded"
    assert data["jobs"]["news_scraper"]["status"] == "stale"


def test_health_degraded_when_job_errored(client):
    """Job en estado error → degraded aunque esté dentro del umbral de tiempo."""
    _add_run("_heartbeat", "ok", hours_ago=0.1)
    _add_run("news_scraper", "error", hours_ago=1)
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "degraded"


def test_health_na_for_unconfigured_job(client):
    """Job sin historial (ej: anuies_loader sin ANUIES_CSV_PATH) → status n/a."""
    _add_run("_heartbeat", "ok", hours_ago=0.1)
    r = client.get("/health")
    data = r.json()
    assert data["jobs"]["anuies_loader"]["status"] == "n/a"
    assert data["jobs"]["anuies_loader"]["last_run"] is None

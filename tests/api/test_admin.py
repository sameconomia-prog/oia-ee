# tests/api/test_admin.py
import pytest
import uuid
from unittest.mock import patch, MagicMock
from pipeline.ingest_gdelt import IngestResult
from pipeline.db.models import IES

FAKE_RESULT = IngestResult(fetched=10, stored=8, classified=7, embedded=6)


def test_ingest_gdelt_sin_key_devuelve_401(client):
    resp = client.post("/admin/ingest/gdelt")
    assert resp.status_code == 401


def test_ingest_gdelt_con_key_valida_devuelve_resultado(client, monkeypatch):
    monkeypatch.setenv("ADMIN_API_KEY", "secret-test-key")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-claude")
    monkeypatch.setenv("VOYAGE_API_KEY", "test-voyage")
    with patch("api.routers.admin.run_gdelt_pipeline", return_value=FAKE_RESULT):
        resp = client.post(
            "/admin/ingest/gdelt",
            headers={"X-Admin-Key": "secret-test-key"},
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["fetched"] == 10
    assert data["stored"] == 8
    assert data["classified"] == 7
    assert data["embedded"] == 6


# --- POST /admin/usuarios ---

def test_crear_usuario_sin_key_devuelve_401(client):
    resp = client.post("/admin/usuarios", json={"username": "u", "password": "p", "ies_id": "x"})
    assert resp.status_code == 401


def test_crear_usuario_ies_inexistente_devuelve_404(client, monkeypatch):
    monkeypatch.setenv("ADMIN_API_KEY", "test-key")
    resp = client.post(
        "/admin/usuarios",
        json={"username": "nuevo", "password": "pass123", "ies_id": str(uuid.uuid4())},
        headers={"X-Admin-Key": "test-key"},
    )
    assert resp.status_code == 404


def test_crear_usuario_exitoso(client, db_session, monkeypatch):
    monkeypatch.setenv("ADMIN_API_KEY", "test-key")
    ies = IES(nombre="IES Test Admin", nombre_corto="ITA")
    db_session.add(ies)
    db_session.flush()

    resp = client.post(
        "/admin/usuarios",
        json={"username": f"rector_{uuid.uuid4().hex[:6]}", "password": "segura123", "ies_id": ies.id},
        headers={"X-Admin-Key": "test-key"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["ies_id"] == ies.id
    assert "password" not in data


def test_crear_usuario_duplicado_devuelve_409(client, db_session, monkeypatch):
    monkeypatch.setenv("ADMIN_API_KEY", "test-key")
    ies = IES(nombre="IES Dup Test", nombre_corto="IDT")
    db_session.add(ies)
    db_session.flush()
    payload = {"username": "rector_dup_test", "password": "pass", "ies_id": ies.id}

    client.post("/admin/usuarios", json=payload, headers={"X-Admin-Key": "test-key"})
    resp = client.post("/admin/usuarios", json=payload, headers={"X-Admin-Key": "test-key"})
    assert resp.status_code == 409


# --- GET /admin/status ---

def test_get_status_sin_key_devuelve_401(client):
    resp = client.get("/admin/status")
    assert resp.status_code == 401


def test_get_status_con_key_devuelve_conteos(client, db_session, monkeypatch):
    monkeypatch.setenv("ADMIN_API_KEY", "test-key")
    ies = IES(nombre="IES Status Test", nombre_corto="IST")
    db_session.add(ies)
    db_session.flush()

    resp = client.get("/admin/status", headers={"X-Admin-Key": "test-key"})
    assert resp.status_code == 200
    data = resp.json()
    assert "ies" in data
    assert "carreras" in data
    assert "noticias" in data
    assert "vacantes" in data
    assert "alertas" in data
    assert data["ies"] >= 1


# --- GET /admin/ies ---

def test_listar_ies_sin_key_devuelve_401(client):
    resp = client.get("/admin/ies")
    assert resp.status_code == 401


def test_listar_ies_devuelve_lista(client, db_session, monkeypatch):
    monkeypatch.setenv("ADMIN_API_KEY", "test-key")
    ies = IES(nombre="IES Lista Test", nombre_corto="ILT")
    db_session.add(ies)
    db_session.flush()

    resp = client.get("/admin/ies", headers={"X-Admin-Key": "test-key"})
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    nombres = [i["nombre"] for i in data]
    assert "IES Lista Test" in nombres


# --- POST /admin/ingest/noticias ---

def test_ingest_noticias_sin_key_devuelve_401(client):
    resp = client.post("/admin/ingest/noticias")
    assert resp.status_code == 401


def test_ingest_noticias_con_key_ok(client, monkeypatch):
    monkeypatch.setenv("ADMIN_API_KEY", "test-key")
    fake = MagicMock()
    fake.fetched = 5
    fake.stored = 3
    fake.classified = 3
    with patch("api.routers.admin.run_news_ingest", return_value=fake):
        resp = client.post("/admin/ingest/noticias", headers={"X-Admin-Key": "test-key"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["fetched"] == 5
    assert data["stored"] == 3


# --- POST /admin/jobs/seed-demo ---

def test_seed_demo_sin_key_devuelve_401(client):
    resp = client.post("/admin/jobs/seed-demo")
    assert resp.status_code == 401


def test_seed_demo_con_key_ok(client, monkeypatch):
    monkeypatch.setenv("ADMIN_API_KEY", "test-key")
    fake = MagicMock()
    fake.ies_creadas = 8
    fake.carreras_creadas = 10
    fake.ocupaciones = 6
    fake.noticias = 15
    fake.vacantes = 25
    with patch("api.routers.admin.run_seed_demo", return_value=fake):
        resp = client.post("/admin/jobs/seed-demo", headers={"X-Admin-Key": "test-key"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["ies_creadas"] == 8
    assert data["vacantes"] == 25


# --- POST /admin/jobs/alertas ---

def test_trigger_alertas_sin_key_devuelve_401(client):
    resp = client.post("/admin/jobs/alertas")
    assert resp.status_code == 401


def test_trigger_alertas_con_key_ok(client, monkeypatch):
    monkeypatch.setenv("ADMIN_API_KEY", "test-key")
    with patch("api.routers.admin.run_alert_job", return_value=3):
        resp = client.post("/admin/jobs/alertas", headers={"X-Admin-Key": "test-key"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["alertas_creadas"] == 3


# --- POST /admin/cache/clear ---

def test_cache_clear_sin_key_devuelve_401(client):
    resp = client.post("/admin/cache/clear")
    assert resp.status_code == 401


def test_cache_clear_con_key_ok(client, monkeypatch):
    monkeypatch.setenv("ADMIN_API_KEY", "test-key")
    resp = client.post("/admin/cache/clear", headers={"X-Admin-Key": "test-key"})
    assert resp.status_code == 200
    assert resp.json()["ok"] is True

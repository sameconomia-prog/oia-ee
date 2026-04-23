# tests/api/test_admin.py
import pytest
import uuid
from unittest.mock import patch
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

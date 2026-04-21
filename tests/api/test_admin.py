# tests/api/test_admin.py
import pytest
from unittest.mock import patch
from pipeline.ingest_gdelt import IngestResult

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

# tests/api/test_kpis_historico.py
import json
from datetime import date
from pipeline.db.models import IES, Carrera, CarreraIES, Ocupacion, KpiHistorico


def _seed(db_session):
    ies = IES(nombre="IES Hist API", nombre_corto="IHA")
    db_session.add(ies)
    occ = Ocupacion(onet_code="15-9999.00", nombre="Dev Hist", p_automatizacion=0.50)
    db_session.add(occ)
    db_session.flush()

    carrera = Carrera(
        nombre_norm="contabilidad histórico",
        onet_codes_relacionados=json.dumps(["15-9999.00"]),
    )
    db_session.add(carrera)
    db_session.flush()

    cie = CarreraIES(
        carrera_id=carrera.id,
        ies_id=ies.id,
        ciclo="2024/2",
        matricula=150,
        egresados=30,
        plan_estudio_skills=json.dumps([]),
    )
    db_session.add(cie)

    for i, fecha in enumerate(["2026-01-01", "2026-02-01", "2026-03-01"]):
        for kpi in ["d1_score", "d2_score", "d3_score", "d6_score"]:
            db_session.add(KpiHistorico(
                entidad_tipo="carrera",
                entidad_id=carrera.id,
                fecha=date.fromisoformat(fecha),
                kpi_nombre=kpi,
                valor=0.3 + i * 0.1,
            ))
    db_session.flush()
    return carrera


def test_historico_carrera_devuelve_serie(client, db_session):
    carrera = _seed(db_session)
    resp = client.get(f"/kpis/historico/carrera/{carrera.id}?kpi=d1_score")
    assert resp.status_code == 200
    data = resp.json()
    assert data["carrera_id"] == carrera.id
    assert data["kpi_nombre"] == "d1_score"
    assert len(data["serie"]) == 3
    fechas = [p["fecha"] for p in data["serie"]]
    assert fechas == sorted(fechas)  # orden ascendente


def test_historico_carrera_kpi_invalido_devuelve_400(client, db_session):
    carrera = _seed(db_session)
    resp = client.get(f"/kpis/historico/carrera/{carrera.id}?kpi=d99_inventado")
    assert resp.status_code == 400


def test_historico_carrera_sin_datos_devuelve_lista_vacia(client):
    resp = client.get("/kpis/historico/carrera/id-inexistente?kpi=d1_score")
    assert resp.status_code == 200
    assert resp.json()["serie"] == []


def test_trigger_kpi_snapshot_sin_key_devuelve_401(client):
    resp = client.post("/admin/jobs/kpi-snapshot")
    assert resp.status_code == 401


def test_trigger_kpi_snapshot_con_key_ok(client, monkeypatch):
    from unittest.mock import patch, MagicMock
    monkeypatch.setenv("ADMIN_API_KEY", "test-key")
    fake = MagicMock()
    fake.carreras_procesadas = 5
    fake.kpis_guardados = 20
    fake.kpis_actualizados = 0
    with patch("api.routers.admin.run_kpi_snapshot", return_value=fake):
        resp = client.post("/admin/jobs/kpi-snapshot", headers={"X-Admin-Key": "test-key"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["carreras_procesadas"] == 5
    assert data["kpis_guardados"] == 20

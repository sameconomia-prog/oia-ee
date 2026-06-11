# tests/api/test_publico_iva_v2.py
import json
import uuid

import pytest

from pipeline.db.models import Carrera
from pipeline.db.models_iex import CarreraSocMap, ExposicionIEX


@pytest.fixture
def carrera(db_session):
    c = Carrera(nombre_norm=f"carrera iva v2 {uuid.uuid4().hex[:6]}",
                onet_codes_relacionados=json.dumps([]))
    db_session.add(c)
    db_session.flush()
    return c


def test_iva_v2_carrera_inexistente_404(client):
    assert client.get("/publico/carreras/no-existe/iva-v2").status_code == 404


def test_iva_v2_sin_crosswalk_retorna_null_y_v1(client, carrera):
    resp = client.get(f"/publico/carreras/{carrera.id}/iva-v2")
    assert resp.status_code == 200
    data = resp.json()
    assert data["iva_v1"] == pytest.approx(0.5)   # default histórico de v1
    assert data["iva_v2"] is None
    assert data["delta"] is None
    assert data["n_soc"] == 0
    assert data["ocupaciones"] == []


def test_iva_v2_con_datos_retorna_componentes(client, carrera, db_session):
    # SOC propio del test: el engine es session-scoped y otros tests commitean 15-1252
    soc = "98-7654"
    db_session.add(ExposicionIEX(
        soc_code=soc, titulo="Ocupación de prueba IVA v2",
        iex_v2=6.0, tipo="B", elasticidad_mx="E-Alta"))
    db_session.add(CarreraSocMap(carrera_id=carrera.id, soc_code=soc))
    db_session.flush()

    resp = client.get(f"/publico/carreras/{carrera.id}/iva-v2")
    assert resp.status_code == 200
    data = resp.json()
    # 0.6 × (1−0.5) × (1−0.25) = 0.225
    assert data["iva_v2"] == pytest.approx(0.225)
    assert data["iex_norm"] == pytest.approx(0.6)
    assert data["fes_factor"] == pytest.approx(0.5)
    assert data["fa"] == pytest.approx(0.25)
    assert data["delta"] == pytest.approx(0.225 - 0.5)
    assert data["n_soc"] == 1
    occ = data["ocupaciones"][0]
    assert occ["soc_code"] == soc
    assert occ["elasticidad_mx"] == "E-Alta"
    assert occ["iex"] == pytest.approx(6.0)

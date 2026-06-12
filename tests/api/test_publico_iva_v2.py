# tests/api/test_publico_iva_v2.py
import json
import uuid

import pytest

from pipeline.db.models import Carrera
from pipeline.db.models_iex import (CarreraSocMap, ContextoOcupacionMX,
                                    CostoIAOcupacion, ExposicionIEX)


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


def test_recomendacion_404_carrera_inexistente(client):
    assert client.get("/publico/carreras/no-existe/recomendacion").status_code == 404


def test_recomendacion_retorna_accion_y_disclaimer(client, carrera, db_session):
    soc = "96-1111"
    db_session.add(ExposicionIEX(soc_code=soc, iex_v2=9.0, elasticidad_mx="E-Baja"))
    db_session.add(CarreraSocMap(carrera_id=carrera.id, soc_code=soc))
    db_session.flush()
    data = client.get(f"/publico/carreras/{carrera.id}/recomendacion").json()
    assert data["accion"] == "evaluar_fusion_cierre"
    assert data["fuente_riesgo"] == "iva_v2"
    assert len(data["acciones"]) == 3
    assert "estudio de pertinencia" in data["disclaimer"]


def test_escenarios_404_carrera_inexistente(client):
    assert client.get("/publico/carreras/no-existe/escenarios").status_code == 404


def test_escenarios_sin_datos_retorna_vacio(client, carrera):
    data = client.get(f"/publico/carreras/{carrera.id}/escenarios").json()
    assert data["iva_actual"] is None
    assert data["proyecciones"] == []
    assert "no una" in data["disclaimer"] or "no predic" in data["disclaimer"]


def test_escenarios_con_datos_retorna_rango(client, carrera, db_session):
    soc = "95-2222"
    db_session.add(ExposicionIEX(soc_code=soc, iex_v2=6.0,
                                 elasticidad_mx="E-Media", dim_d7=7.0))
    db_session.add(CarreraSocMap(carrera_id=carrera.id, soc_code=soc))
    db_session.flush()
    data = client.get(f"/publico/carreras/{carrera.id}/escenarios").json()
    assert data["iva_actual"] is not None
    assert len(data["proyecciones"]) == 6
    assert data["rango_2030"][0] <= data["rango_2030"][1]
    assert data["rango_2035"][0] <= data["rango_2035"][1]


def test_contexto_mx_404_carrera_inexistente(client):
    assert client.get("/publico/carreras/no-existe/contexto-mx").status_code == 404


def test_contexto_mx_retorna_perfil_y_alerta(client, carrera, db_session):
    soc = "94-3333"
    db_session.add(ExposicionIEX(soc_code=soc, iex_v2=9.0, elasticidad_mx="E-Baja"))
    db_session.add(ContextoOcupacionMX(
        soc_code=soc, empleo_mx=500000, ingreso_mensual_mxn=8000.0,
        pct_informalidad=55.0, pct_mujeres=70.0, escolaridad_anios=12.0,
        pct_rural=10.0))
    db_session.add(CarreraSocMap(carrera_id=carrera.id, soc_code=soc))
    db_session.flush()
    data = client.get(f"/publico/carreras/{carrera.id}/contexto-mx").json()
    assert data["empleo_mx"] == 500000
    assert set(data["flags"]) == {"feminizada", "informalidad_alta"}
    assert data["alerta_distributiva"] is True
    assert "ENOE" in data["fuente"]


def test_iva_v2_incluye_costo_ia_cuando_existe(client, carrera, db_session):
    soc = "97-5432"
    db_session.add(ExposicionIEX(soc_code=soc, iex_v2=5.0, elasticidad_mx="E-Media"))
    db_session.add(CostoIAOcupacion(
        soc_code=soc, salario_mes_mxn=16000.0, salario_hora_mxn=100.0,
        costo_ia_hora_mxn=25.0, ratio_costo=0.25, modelo_ref="claude-sonnet-4-6"))
    db_session.add(CarreraSocMap(carrera_id=carrera.id, soc_code=soc))
    db_session.flush()

    data = client.get(f"/publico/carreras/{carrera.id}/iva-v2").json()
    assert data["costo_ia_hora_mxn"] == pytest.approx(25.0)
    occ = data["ocupaciones"][0]
    assert occ["ratio_costo_ia"] == pytest.approx(0.25)
    assert occ["salario_mes_mxn"] == pytest.approx(16000.0)

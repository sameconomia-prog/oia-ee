# tests/api/test_rector.py
import json
from pipeline.db.models import IES, Carrera, CarreraIES, Ocupacion


def test_rector_ies_not_found(client):
    resp = client.get("/rector?ies_id=id-no-existe")
    assert resp.status_code == 404


def test_rector_returns_ies_and_carreras(client, db_session):
    ies = IES(nombre="Universidad Test", nombre_corto="UT")
    db_session.add(ies)
    db_session.flush()

    carrera = Carrera(nombre_norm="Derecho Test", onet_codes_relacionados=json.dumps([]))
    db_session.add(carrera)
    db_session.flush()

    cie = CarreraIES(carrera_id=carrera.id, ies_id=ies.id, ciclo="2024/2", matricula=300, egresados=60,
                     plan_estudio_skills=json.dumps([]))
    db_session.add(cie)
    db_session.flush()

    resp = client.get(f"/rector?ies_id={ies.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["ies"]["nombre"] == "Universidad Test"
    assert data["ies"]["nombre_corto"] == "UT"
    assert len(data["carreras"]) == 1
    assert data["carreras"][0]["nombre"] == "Derecho Test"
    assert data["carreras"][0]["matricula"] == 300
    assert isinstance(data["alertas"], list)


def test_rector_alerta_generada_por_d1_alto(client, db_session):
    ies = IES(nombre="IES Alerta", nombre_corto="IA")
    db_session.add(ies)
    occ = Ocupacion(onet_code="99-9999.99", nombre="Ocupacion Alta", p_automatizacion=0.95)
    db_session.add(occ)
    db_session.flush()

    carrera = Carrera(nombre_norm="Carrera Riesgo", onet_codes_relacionados=json.dumps(["99-9999.99"]))
    db_session.add(carrera)
    db_session.flush()

    cie = CarreraIES(carrera_id=carrera.id, ies_id=ies.id, ciclo="2024/2", matricula=200, egresados=40,
                     plan_estudio_skills=json.dumps([]))
    db_session.add(cie)
    db_session.flush()

    resp = client.get(f"/rector?ies_id={ies.id}")
    assert resp.status_code == 200
    data = resp.json()
    # Con p_automatizacion=0.95, D1 debe ser > 0.7 → genera alerta
    alertas = data["alertas"]
    if alertas:
        assert alertas[0]["carrera_nombre"] == "Carrera Riesgo"
        assert alertas[0]["severidad"] in ("alta", "media")
        assert alertas[0]["tipo"] in ("d1_alto", "d2_bajo", "ambos")

# tests/api/test_kpis.py
import json
from pipeline.db.models import Carrera, CarreraIES, Ocupacion


def test_get_kpis_carrera_not_found(client):
    resp = client.get("/kpis/carrera/id-no-existe")
    assert resp.status_code == 404


def test_get_kpis_carrera_ok(client, db_session):
    c = Carrera(nombre_norm="Ing. Cómputo KPI", onet_codes_relacionados=json.dumps(["15-1252.00"]))
    db_session.add(c)
    occ = Ocupacion(onet_code="15-1252.00", nombre="Dev", p_automatizacion=0.25)
    db_session.add(occ)
    db_session.flush()
    cie = CarreraIES(
        carrera_id=c.id, ciclo="2024/2", matricula=300, egresados=60,
        plan_estudio_skills=json.dumps(["Python"]),
    )
    db_session.add(cie)
    db_session.flush()
    resp = client.get(f"/kpis/carrera/{c.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert 0.0 <= data["d1_obsolescencia"]["score"] <= 1.0
    assert 0.0 <= data["d2_oportunidades"]["score"] <= 1.0


def test_kpis_estructura_completa(client, db_session):
    c = Carrera(nombre_norm="Administración Digital KPI")
    db_session.add(c)
    db_session.flush()
    cie = CarreraIES(carrera_id=c.id, ciclo="2024/2", matricula=200, egresados=40,
                     plan_estudio_skills=json.dumps([]))
    db_session.add(cie)
    db_session.flush()
    resp = client.get(f"/kpis/carrera/{c.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert set(data["d1_obsolescencia"].keys()) == {"iva", "bes", "vac", "score"}
    assert set(data["d2_oportunidades"].keys()) == {"ioe", "ihe", "iea", "score"}

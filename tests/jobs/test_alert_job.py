# tests/jobs/test_alert_job.py
import json
from pipeline.db.models import IES, Carrera, CarreraIES, Ocupacion, Alerta
from pipeline.jobs.alert_job import run_alert_job


def test_alert_job_persiste_alerta_d1_alto(session):
    ies = IES(nombre="IES Job Test", nombre_corto="IJT")
    session.add(ies)
    occ = Ocupacion(onet_code="55-5555.55", nombre="Ocup Alta Auto", p_automatizacion=0.95)
    session.add(occ)
    session.flush()

    carrera = Carrera(
        nombre_norm="Carrera Alta Auto",
        onet_codes_relacionados=json.dumps(["55-5555.55"]),
    )
    session.add(carrera)
    session.flush()

    cie = CarreraIES(
        carrera_id=carrera.id,
        ies_id=ies.id,
        ciclo="2024/2",
        matricula=100,
        egresados=20,
        plan_estudio_skills=json.dumps([]),
    )
    session.add(cie)
    session.flush()

    creadas = run_alert_job(session)

    alertas = session.query(Alerta).filter_by(ies_id=ies.id).all()
    assert creadas >= 1
    assert len(alertas) >= 1
    assert alertas[0].tipo in ("d1_alto", "ambos")
    assert alertas[0].severidad in ("alta", "media")


def test_alert_job_no_duplica_alertas(session):
    ies = IES(nombre="IES No Dup", nombre_corto="IND")
    session.add(ies)
    occ = Ocupacion(onet_code="66-6666.66", nombre="Ocup NoDup", p_automatizacion=0.95)
    session.add(occ)
    session.flush()

    carrera = Carrera(
        nombre_norm="Carrera NoDup",
        onet_codes_relacionados=json.dumps(["66-6666.66"]),
    )
    session.add(carrera)
    session.flush()

    cie = CarreraIES(
        carrera_id=carrera.id,
        ies_id=ies.id,
        ciclo="2024/2",
        matricula=80,
        egresados=16,
        plan_estudio_skills=json.dumps([]),
    )
    session.add(cie)
    session.flush()

    run_alert_job(session)
    run_alert_job(session)

    alertas = session.query(Alerta).filter_by(ies_id=ies.id).all()
    assert len(alertas) == 1, f"Expected 1 alerta, got {len(alertas)} (deduplication failed)"

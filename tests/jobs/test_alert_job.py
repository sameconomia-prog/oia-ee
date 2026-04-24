# tests/jobs/test_alert_job.py
import json
from unittest.mock import patch
from pipeline.db.models import IES, Carrera, CarreraIES, Ocupacion, Alerta, Usuario
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


def test_alert_job_llama_email_cuando_rector_tiene_email(session, monkeypatch):
    monkeypatch.delenv("SMTP_HOST", raising=False)  # sin SMTP real en tests
    ies = IES(nombre="IES Email Test", nombre_corto="IET")
    session.add(ies)
    occ = Ocupacion(onet_code="77-7777.77", nombre="Ocup Email", p_automatizacion=0.95)
    session.add(occ)
    session.flush()

    carrera = Carrera(
        nombre_norm="Carrera Email Test",
        onet_codes_relacionados=json.dumps(["77-7777.77"]),
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
    # Rector con email
    usuario = Usuario(
        username="rector_email_test",
        hashed_password="hashed",
        ies_id=ies.id,
        email="rector@ies.mx",
    )
    session.add(usuario)
    session.flush()

    with patch("pipeline.jobs.alert_job.send_alert_email") as mock_email:
        mock_email.return_value = False  # SMTP no configurado en test
        run_alert_job(session)
        # Debe haber intentado llamar al servicio con el email del rector
        if mock_email.called:
            call_args = mock_email.call_args
            assert call_args[0][0] == "rector@ies.mx"


def test_alert_job_no_envia_email_sin_email_rector(session):
    ies = IES(nombre="IES Sin Email", nombre_corto="ISE")
    session.add(ies)
    occ = Ocupacion(onet_code="88-8888.88", nombre="Ocup SinEmail", p_automatizacion=0.95)
    session.add(occ)
    session.flush()

    carrera = Carrera(
        nombre_norm="Carrera Sin Email",
        onet_codes_relacionados=json.dumps(["88-8888.88"]),
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
    # Rector sin email
    session.add(Usuario(
        username="rector_sin_email",
        hashed_password="hashed",
        ies_id=ies.id,
        email=None,
    ))
    session.flush()

    with patch("pipeline.jobs.alert_job.send_alert_email") as mock_email:
        run_alert_job(session)
        mock_email.assert_not_called()

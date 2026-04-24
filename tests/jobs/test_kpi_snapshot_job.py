# tests/jobs/test_kpi_snapshot_job.py
import json
from datetime import date
from pipeline.db.models import IES, Carrera, CarreraIES, Ocupacion, KpiHistorico
from pipeline.jobs.kpi_snapshot_job import run_kpi_snapshot


def _setup_carrera(session):
    ies = IES(nombre="IES Snapshot Test", nombre_corto="IST")
    session.add(ies)
    occ = Ocupacion(onet_code="15-1111.00", nombre="Software Dev", p_automatizacion=0.42)
    session.add(occ)
    session.flush()

    carrera = Carrera(
        nombre_norm="ingeniería en sistemas snap",
        onet_codes_relacionados=json.dumps(["15-1111.00"]),
    )
    session.add(carrera)
    session.flush()

    cie = CarreraIES(
        carrera_id=carrera.id,
        ies_id=ies.id,
        ciclo="2024/2",
        matricula=200,
        egresados=40,
        plan_estudio_skills=json.dumps(["python", "sql"]),
    )
    session.add(cie)
    session.flush()
    return carrera


def test_snapshot_persiste_kpis(session):
    carrera = _setup_carrera(session)
    result = run_kpi_snapshot(session)

    assert result.carreras_procesadas >= 1

    rows = session.query(KpiHistorico).filter_by(entidad_tipo='carrera', entidad_id=carrera.id).all()
    assert len(rows) == 4
    kpi_nombres = {r.kpi_nombre for r in rows}
    assert {'d1_score', 'd2_score', 'd3_score', 'd6_score'} == kpi_nombres
    for r in rows:
        assert 0.0 <= float(r.valor) <= 1.0


def test_snapshot_upsert_no_duplica(session):
    carrera = _setup_carrera(session)
    fecha = date(2025, 6, 1)

    run_kpi_snapshot(session, fecha=fecha)
    count_primera = session.query(KpiHistorico).filter_by(
        entidad_tipo='carrera', entidad_id=carrera.id, fecha=fecha
    ).count()

    run_kpi_snapshot(session, fecha=fecha)
    count_segunda = session.query(KpiHistorico).filter_by(
        entidad_tipo='carrera', entidad_id=carrera.id, fecha=fecha
    ).count()

    assert count_primera == 4
    assert count_segunda == 4  # no duplicó


def test_snapshot_fecha_parametrizable(session):
    carrera = _setup_carrera(session)
    fecha_custom = date(2026, 1, 15)

    result = run_kpi_snapshot(session, fecha=fecha_custom)

    rows = session.query(KpiHistorico).filter_by(
        entidad_tipo='carrera', entidad_id=carrera.id, fecha=fecha_custom
    ).all()
    assert len(rows) == 4
    assert result.kpis_guardados >= 4


def test_snapshot_sin_carreras_en_session_vacia(session):
    # No seed — consulta IDs de carrera_ies en la sesión actual
    carrera_ids_antes = [r[0] for r in session.query(CarreraIES.carrera_id).distinct().all()]
    result = run_kpi_snapshot(session)
    assert result.carreras_procesadas == len(carrera_ids_antes)

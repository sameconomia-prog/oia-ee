import itertools
from datetime import date, datetime, time, timedelta

from pipeline.db.models import Noticia, Vacante
from pipeline.db.models_d7_validacion import D7ValidacionSnapshot
from pipeline.jobs.d7_validacion_job import (
    LAG_DIAS,
    evaluar_validacion_d7,
    run_d7_validacion_snapshot,
)

HOY = date(2026, 6, 12)
_seq = itertools.count()


def _add_noticia(db, sector: str, fecha: date):
    n = Noticia(
        titulo=f"Noticia {next(_seq)}",
        url=f"https://example.com/n/{next(_seq)}",
        fecha_pub=datetime.combine(fecha, time(12, 0)),
        sector=sector,
    )
    db.add(n)
    db.flush()
    return n


def _add_vacante(db, sector: str, fecha: date):
    v = Vacante(
        titulo="Analista",
        sector=sector,
        fecha_pub=fecha,
        fuente="occ",
        url=f"https://occ.example.com/v/{next(_seq)}",
    )
    db.add(v)
    db.flush()
    return v


def test_snapshot_persiste_conteos_por_sector(session):
    for _ in range(3):
        _add_noticia(session, "tecnología", HOY - timedelta(days=2))
    for _ in range(2):
        _add_noticia(session, "tecnología", HOY - timedelta(days=20))
    _add_noticia(session, "salud", HOY - timedelta(days=10))
    for _ in range(4):
        _add_vacante(session, "tecnología", HOY - timedelta(days=15))

    result = run_d7_validacion_snapshot(session, fecha=HOY)

    assert result.sectores == 2
    assert result.guardados == 2
    tec = session.query(D7ValidacionSnapshot).filter_by(fecha=HOY, sector="tecnología").one()
    assert tec.noticias_7d == 3
    assert tec.noticias_30d == 5
    assert tec.vacantes_30d == 4
    assert 0.0 <= tec.isn_global <= 1.0
    assert 0.0 <= tec.vdm_global <= 1.0
    salud = session.query(D7ValidacionSnapshot).filter_by(fecha=HOY, sector="salud").one()
    assert salud.noticias_30d == 1
    assert salud.vacantes_30d == 0


def test_snapshot_es_idempotente(session):
    _add_noticia(session, "tecnología", HOY - timedelta(days=1))
    primera = run_d7_validacion_snapshot(session, fecha=HOY)
    segunda = run_d7_validacion_snapshot(session, fecha=HOY)

    assert primera.guardados == 1
    assert segunda.guardados == 0
    assert segunda.actualizados == 1
    assert session.query(D7ValidacionSnapshot).filter_by(fecha=HOY).count() == 1


def test_evaluacion_sin_pares_maduros(session):
    _add_noticia(session, "tecnología", HOY - timedelta(days=1))
    run_d7_validacion_snapshot(session, fecha=HOY)

    resultado = evaluar_validacion_d7(session, hoy=HOY)

    assert resultado["pares_totales"] == 0
    assert resultado["sectores"] == []
    assert resultado["correlacion_promedio"] is None


def test_evaluacion_correlaciona_senal_con_vacantes_realizadas(session):
    # 3 snapshots maduros donde más noticias → más vacantes 12 meses después
    casos = [
        (HOY - timedelta(days=450), 1, 2),
        (HOY - timedelta(days=420), 5, 10),
        (HOY - timedelta(days=390), 10, 20),
    ]
    for fecha_snap, noticias, vacantes_realizadas in casos:
        session.add(D7ValidacionSnapshot(
            fecha=fecha_snap,
            sector="tecnología",
            noticias_7d=noticias,
            noticias_30d=noticias,
            vacantes_30d=0,
        ))
        objetivo = fecha_snap + timedelta(days=LAG_DIAS)
        for _ in range(vacantes_realizadas):
            _add_vacante(session, "tecnología", objetivo - timedelta(days=5))
    session.flush()

    resultado = evaluar_validacion_d7(session, hoy=HOY)

    assert resultado["pares_totales"] == 3
    assert len(resultado["sectores"]) == 1
    assert resultado["sectores"][0]["sector"] == "tecnología"
    assert resultado["sectores"][0]["correlacion"] == 1.0
    assert resultado["correlacion_promedio"] == 1.0

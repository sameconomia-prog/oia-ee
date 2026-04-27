# tests/jobs/test_imss_ingest_job.py
import pytest
from datetime import date
from unittest.mock import patch
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from pipeline.db.models import Base
from pipeline.db.models_imss import EmpleoFormalIMSS
from pipeline.jobs.imss_ingest_job import run_imss_ingest


@pytest.fixture
def session():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    s = Session()
    yield s
    s.rollback()
    s.close()


_FAKE_RECORDS = [
    {"estado": "Jalisco", "sector_scian": "31", "sector_nombre": "Manufactura",
     "anio": 2025, "mes": 3, "trabajadores": 125000, "fecha_corte": date(2025, 3, 1)},
    {"estado": "CDMX", "sector_scian": "52", "sector_nombre": "Financiero",
     "anio": 2025, "mes": 3, "trabajadores": 88000, "fecha_corte": date(2025, 3, 1)},
]


def test_inserta_nuevos_registros(session):
    with patch("pipeline.jobs.imss_ingest_job.fetch_imss_empleo",
               return_value=_FAKE_RECORDS):
        result = run_imss_ingest(session)

    assert result["insertados"] == 2
    assert result["actualizados"] == 0
    assert session.query(EmpleoFormalIMSS).count() == 2


def test_upsert_actualiza_trabajadores_existente(session):
    with patch("pipeline.jobs.imss_ingest_job.fetch_imss_empleo",
               return_value=_FAKE_RECORDS):
        run_imss_ingest(session)

    updated = [
        {"estado": "Jalisco", "sector_scian": "31", "sector_nombre": "Manufactura",
         "anio": 2025, "mes": 3, "trabajadores": 130000, "fecha_corte": date(2025, 3, 1)},
    ]
    with patch("pipeline.jobs.imss_ingest_job.fetch_imss_empleo",
               return_value=updated):
        result = run_imss_ingest(session)

    assert result["actualizados"] == 1
    assert result["insertados"] == 0
    jalisco = session.query(EmpleoFormalIMSS).filter_by(
        estado="Jalisco", sector_scian="31", anio=2025, mes=3
    ).first()
    assert jalisco.trabajadores == 130000


def test_lista_vacia_no_falla(session):
    with patch("pipeline.jobs.imss_ingest_job.fetch_imss_empleo", return_value=[]):
        result = run_imss_ingest(session)
    assert result["procesados"] == 0

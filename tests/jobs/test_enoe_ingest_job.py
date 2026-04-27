import pytest
from datetime import date
from unittest.mock import patch
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from pipeline.db.models import Base
from pipeline.db.models_enoe import IndicadorENOE
from pipeline.jobs.enoe_ingest_job import run_enoe_ingest


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
    {"estado": "Nacional", "anio": 2025, "trimestre": 1,
     "tasa_desempleo": 2.9, "poblacion_ocupada": 57000,
     "fecha_corte": date(2025, 1, 1)},
    {"estado": "Jalisco", "anio": 2025, "trimestre": 1,
     "tasa_desempleo": 2.4, "poblacion_ocupada": 3800,
     "fecha_corte": date(2025, 1, 1)},
]


def test_inserta_nuevos_registros(session):
    with patch("pipeline.jobs.enoe_ingest_job.fetch_enoe_indicadores",
               return_value=_FAKE_RECORDS):
        result = run_enoe_ingest(session)

    assert result["insertados"] == 2
    assert result["actualizados"] == 0
    assert session.query(IndicadorENOE).count() == 2


def test_upsert_actualiza_tasa_existente(session):
    with patch("pipeline.jobs.enoe_ingest_job.fetch_enoe_indicadores",
               return_value=_FAKE_RECORDS):
        run_enoe_ingest(session)

    updated = [
        {"estado": "Nacional", "anio": 2025, "trimestre": 1,
         "tasa_desempleo": 3.1, "poblacion_ocupada": 57100,
         "fecha_corte": date(2025, 1, 1)},
    ]
    with patch("pipeline.jobs.enoe_ingest_job.fetch_enoe_indicadores",
               return_value=updated):
        result = run_enoe_ingest(session)

    assert result["actualizados"] == 1
    assert result["insertados"] == 0
    nacional = session.query(IndicadorENOE).filter_by(
        estado="Nacional", anio=2025, trimestre=1
    ).first()
    assert nacional.tasa_desempleo == pytest.approx(3.1)
    assert nacional.poblacion_ocupada == 57100


def test_lista_vacia_no_falla(session):
    with patch("pipeline.jobs.enoe_ingest_job.fetch_enoe_indicadores", return_value=[]):
        result = run_enoe_ingest(session)
    assert result["procesados"] == 0

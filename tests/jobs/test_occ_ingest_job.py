# tests/jobs/test_occ_ingest_job.py
import json
from datetime import date
from unittest.mock import patch
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from pipeline.db.models import Base, Vacante
from pipeline.scrapers.occ_scraper import OccVacante
from pipeline.jobs.occ_ingest_job import run_occ_ingest


@pytest.fixture
def session():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    s = Session()
    yield s
    s.rollback()
    s.close()


def _vac(titulo="ML Engineer", url="https://www.occ.com.mx/empleos/1/"):
    return OccVacante(
        titulo=titulo,
        empresa="TechCorp",
        url=url,
        descripcion="PyTorch experience required.",
        skills=["Python", "PyTorch"],
        salario_min=40000,
        salario_max=70000,
        estado="Jalisco",
        nivel_educativo="licenciatura",
        fecha_pub=date.today(),
    )


def test_run_occ_ingest_inserta_vacantes(session):
    with patch("pipeline.jobs.occ_ingest_job.OccScraper") as mock_cls:
        mock_cls.return_value.scrape.return_value = [_vac()]
        result = run_occ_ingest(session)
    assert result.insertadas == 1
    assert result.duplicadas == 0
    assert session.query(Vacante).count() == 1
    v = session.query(Vacante).first()
    assert v.fuente == "occ"
    assert v.titulo == "ML Engineer"
    assert json.loads(v.skills) == ["Python", "PyTorch"]


def test_run_occ_ingest_dedup_por_url(session):
    same_url = "https://www.occ.com.mx/empleos/1/"
    with patch("pipeline.jobs.occ_ingest_job.OccScraper") as mock_cls:
        mock_cls.return_value.scrape.return_value = [_vac(url=same_url)]
        run_occ_ingest(session)
    session.flush()
    with patch("pipeline.jobs.occ_ingest_job.OccScraper") as mock_cls:
        mock_cls.return_value.scrape.return_value = [_vac(titulo="ML Engineer v2", url=same_url)]
        result = run_occ_ingest(session)
    assert result.duplicadas == 1
    assert session.query(Vacante).filter_by(fuente="occ").count() == 1


def test_run_occ_ingest_lista_vacia(session):
    with patch("pipeline.jobs.occ_ingest_job.OccScraper") as mock_cls:
        mock_cls.return_value.scrape.return_value = []
        result = run_occ_ingest(session)
    assert result.insertadas == 0
    assert result.procesadas == 0

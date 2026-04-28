import pytest
from datetime import date
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from pipeline.db.models import Base, Vacante
from pipeline.loaders.stps_loader import StpsVacante
from pipeline.jobs.stps_ingest_job import ingest_stps


@pytest.fixture
def session():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    s = Session()
    yield s
    s.rollback()
    s.close()


def _vac(titulo="Dev", empresa="Acme", sector="Tecnología", estado="Jalisco",
         fecha=None, skills=None):
    return StpsVacante(
        titulo=titulo, empresa=empresa, sector=sector,
        skills=skills or ["Python"], salario_min=30000, salario_max=50000,
        fecha_pub=fecha or date.today(), estado=estado,
        nivel_educativo="licenciatura", experiencia_anios=2,
    )


def test_ingest_inserta_vacante(session):
    result = ingest_stps([_vac()], session)
    assert result.insertadas == 1
    assert result.duplicadas == 0
    assert session.query(Vacante).count() == 1


def test_ingest_dedup_por_titulo_empresa_fecha(session):
    v = _vac()
    ingest_stps([v], session)
    result = ingest_stps([v], session)
    assert result.duplicadas == 1
    assert session.query(Vacante).count() == 1


def test_ingest_multiples_vacantes(session):
    vacantes = [_vac(titulo=f"Dev {i}", empresa="Acme") for i in range(5)]
    result = ingest_stps(vacantes, session)
    assert result.insertadas == 5
    assert session.query(Vacante).count() == 5


def test_ingest_persiste_estado_y_sector(session):
    ingest_stps([_vac(estado="Nuevo León", sector="Fintech")], session)
    v = session.query(Vacante).first()
    assert v.estado == "Nuevo León"
    assert v.sector == "Fintech"


def test_ingest_lista_vacia(session):
    result = ingest_stps([], session)
    assert result.procesadas == 0
    assert result.insertadas == 0


# ── agregar al final de tests/jobs/test_stps_ingest_job.py ──
import io
import csv
from unittest.mock import patch, MagicMock
from pipeline.jobs.stps_ingest_job import run_stps_ingest


def _make_csv_bytes() -> bytes:
    """CSV mínimo compatible con StpsLoader."""
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=[
        "titulo", "empresa", "sector", "habilidades",
        "salario_min", "salario_max", "fecha_publicacion",
        "estado", "nivel_educativo", "experiencia",
    ])
    writer.writeheader()
    writer.writerow({
        "titulo": "Data Scientist", "empresa": "Acme", "sector": "Tech",
        "habilidades": "Python,ML", "salario_min": "40000", "salario_max": "60000",
        "fecha_publicacion": "2026-04-01", "estado": "CDMX",
        "nivel_educativo": "licenciatura", "experiencia": "3",
    })
    return buf.getvalue().encode("utf-8")


def test_run_stps_ingest_auto_download(session):
    mock_resp = MagicMock()
    mock_resp.raise_for_status.return_value = None
    mock_resp.content = _make_csv_bytes()
    with patch("pipeline.jobs.stps_ingest_job.httpx.get", return_value=mock_resp):
        result = run_stps_ingest(session)
    assert result.insertadas == 1
    assert session.query(Vacante).filter_by(fuente="stps").count() == 1


def test_run_stps_ingest_con_path(tmp_path, session):
    csv_file = tmp_path / "test.csv"
    csv_file.write_bytes(_make_csv_bytes())
    result = run_stps_ingest(session, csv_path=csv_file)
    assert result.insertadas == 1


def test_run_stps_ingest_download_error(session):
    import httpx as _httpx
    with patch("pipeline.jobs.stps_ingest_job.httpx.get",
               side_effect=_httpx.HTTPError("timeout")):
        with pytest.raises(_httpx.HTTPError):
            run_stps_ingest(session)

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

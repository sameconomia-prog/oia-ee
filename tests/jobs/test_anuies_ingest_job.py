import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from pipeline.db.models import Base, IES, Carrera, CarreraIES
from pipeline.loaders.anuies_loader import AnuiesRecord
from pipeline.jobs.anuies_ingest_job import ingest_anuies, _normalizar_nombre


@pytest.fixture
def session():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    s = Session()
    yield s
    s.rollback()
    s.close()


def _rec(clave="001", nombre_ies="UNAM", estado="CDMX", nombre_carrera="Ing. Sistemas",
         ciclo="2024/2", matricula=500, egresados=100):
    return AnuiesRecord(
        clave_sep=clave, nombre_ies=nombre_ies, tipo="pública", subsistema="federal",
        estado=estado, matricula_total=50000, nombre_carrera=nombre_carrera,
        area_conocimiento="Ingeniería", nivel="licenciatura",
        matricula=matricula, egresados=egresados, ciclo=ciclo,
    )


def test_normalizar_nombre():
    assert _normalizar_nombre("  Ing.  Sistemas  ") == "ing. sistemas"


def test_ingest_crea_ies_y_carrera(session):
    result = ingest_anuies([_rec()], session)
    assert result.ies_creadas == 1
    assert result.carreras_creadas == 1
    assert result.carrera_ies_creadas == 1
    assert session.query(IES).count() == 1
    assert session.query(Carrera).count() == 1
    assert session.query(CarreraIES).count() == 1


def test_ingest_upsert_no_duplica_ies(session):
    ingest_anuies([_rec()], session)
    result = ingest_anuies([_rec(nombre_carrera="Administración")], session)
    assert result.ies_creadas == 0
    assert result.ies_actualizadas == 1
    assert session.query(IES).count() == 1


def test_ingest_upsert_no_duplica_carrera(session):
    ingest_anuies([_rec()], session)
    ingest_anuies([_rec()], session)
    assert session.query(Carrera).count() == 1
    assert session.query(CarreraIES).count() == 1


def test_ingest_multiples_ies(session):
    records = [
        _rec(clave="001", nombre_ies="UNAM", nombre_carrera="Economía"),
        _rec(clave="002", nombre_ies="TEC", estado="Nuevo León", nombre_carrera="Economía"),
    ]
    result = ingest_anuies(records, session)
    assert result.ies_creadas == 2
    assert result.carreras_creadas == 1  # misma carrera
    assert result.carrera_ies_creadas == 2
    assert session.query(IES).count() == 2
    assert session.query(Carrera).count() == 1
    assert session.query(CarreraIES).count() == 2


def test_ingest_actualiza_matricula(session):
    ingest_anuies([_rec(matricula=500)], session)
    ingest_anuies([_rec(matricula=600)], session)
    cie = session.query(CarreraIES).first()
    assert cie.matricula == 600

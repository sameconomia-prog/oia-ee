# tests/kpi_engine/test_d1.py
import json
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from pipeline.db.models import Base, Carrera, CarreraIES, Ocupacion, Vacante
from pipeline.kpi_engine.d1_obsolescencia import calcular_iva, calcular_bes, calcular_vac, calcular_d1


@pytest.fixture
def session():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    s = Session()
    yield s
    s.rollback()
    s.close()


def _carrera(session, onet_codes=None):
    c = Carrera(
        nombre_norm="Ingeniería en Sistemas",
        onet_codes_relacionados=json.dumps(onet_codes or ["15-1252.00"]),
    )
    session.add(c)
    session.flush()
    return c


def _carrera_ies(session, carrera, plan_skills=None, egresados=100, matricula=500):
    cie = CarreraIES(
        carrera_id=carrera.id,
        ciclo="2024/2",
        matricula=matricula,
        egresados=egresados,
        plan_estudio_skills=json.dumps(plan_skills or ["Python", "SQL", "Java"]),
    )
    session.add(cie)
    session.flush()
    return cie


def test_calcular_iva_con_ocupacion(session):
    c = _carrera(session, onet_codes=["15-1252.00"])
    occ = Ocupacion(onet_code="15-1252.00", nombre="Software Developers", p_automatizacion=0.18)
    session.add(occ)
    session.flush()
    iva = calcular_iva(c, session)
    assert iva == pytest.approx(0.18, abs=0.01)


def test_calcular_iva_sin_ocupaciones_retorna_default(session):
    c = _carrera(session, onet_codes=[])
    iva = calcular_iva(c, session)
    assert iva == 0.5


def test_calcular_bes_con_overlap(session):
    c = _carrera(session)
    cie = _carrera_ies(session, c, plan_skills=["Python", "SQL", "Java"])
    v = Vacante(titulo="Dev", skills=json.dumps(["Python", "Docker", "Kubernetes"]), fuente="stps")
    session.add(v)
    session.flush()
    bes = calcular_bes(cie, session)
    # plan=[python, sql, java], demanded=[python, docker, kubernetes], overlap=1, BES=1-1/3=0.6667
    assert bes == pytest.approx(2/3, abs=0.001)


def test_calcular_d1_score_en_rango(session):
    c = _carrera(session)
    occ = Ocupacion(onet_code="15-1252.00", nombre="Dev", p_automatizacion=0.45)
    session.add(occ)
    cie = _carrera_ies(session, c)
    session.flush()
    result = calcular_d1(c, cie, session)
    assert 0.0 <= result.score <= 1.0
    assert 0.0 <= result.iva <= 1.0
    assert 0.0 <= result.bes <= 1.0
    assert 0.0 <= result.vac <= 1.0


def test_calcular_vac_con_vacantes(session):
    c = _carrera(session)
    cie = _carrera_ies(session, c, egresados=10)
    for i in range(5):
        session.add(Vacante(titulo=f"Dev {i}", skills=json.dumps([]), fuente="stps"))
    session.flush()
    vac = calcular_vac(cie, session)
    # 5 vacantes / 10 egresados = 0.5 ratio, VAC = 1 - 0.5 = 0.5
    assert vac == pytest.approx(0.5, abs=0.001)

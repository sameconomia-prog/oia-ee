# tests/kpi_engine/test_d2.py
import json
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from pipeline.db.models import Base, Carrera, CarreraIES, Vacante
from pipeline.kpi_engine.d2_oportunidades import calcular_ioe, calcular_ihe, calcular_iea, calcular_d2


@pytest.fixture
def session():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    s = Session()
    yield s
    s.rollback()
    s.close()


def _cie(session, plan_skills=None, egresados=100, matricula=500):
    c = Carrera(nombre_norm=f"carrera_{id(plan_skills)}")
    session.add(c)
    session.flush()
    cie = CarreraIES(
        carrera_id=c.id,
        ciclo="2024/2",
        matricula=matricula,
        egresados=egresados,
        plan_estudio_skills=json.dumps(plan_skills or []),
    )
    session.add(cie)
    session.flush()
    return cie


def test_calcular_ioe_con_vacantes_emergentes(session):
    v1 = Vacante(titulo="ML Engineer", skills=json.dumps(["python", "machine learning"]), fuente="stps")
    v2 = Vacante(titulo="Contador", skills=json.dumps(["Excel", "Contabilidad"]), fuente="stps")
    session.add_all([v1, v2])
    session.flush()
    ioe = calcular_ioe(session)
    assert ioe == pytest.approx(0.5, abs=0.01)


def test_calcular_ihe_con_skills_emergentes(session):
    cie = _cie(session, plan_skills=["python", "machine learning", "Java"])
    ihe = calcular_ihe(cie)
    assert ihe > 0.0


def test_calcular_ihe_sin_skills_emergentes(session):
    cie = _cie(session, plan_skills=["Contabilidad", "Derecho"])
    ihe = calcular_ihe(cie)
    assert ihe == 0.0


def test_calcular_d2_score_en_rango(session):
    cie = _cie(session, plan_skills=["python", "cloud"])
    result = calcular_d2(cie, session)
    assert 0.0 <= result.score <= 1.0
    assert 0.0 <= result.ioe <= 1.0
    assert 0.0 <= result.ihe <= 1.0
    assert 0.0 <= result.iea <= 1.0

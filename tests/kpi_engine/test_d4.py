# tests/kpi_engine/test_d4.py
import json
import uuid
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from pipeline.db.models import Base, IES, Carrera, CarreraIES
from pipeline.kpi_engine.d4_institucional import (
    calcular_tra, calcular_irf, calcular_cad, calcular_d4,
)


@pytest.fixture
def session():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    s = Session()
    yield s
    s.rollback()
    s.close()


def _ies(session):
    ies = IES(nombre="Universidad Test")
    session.add(ies)
    session.flush()
    return ies


def _carrera_ies(session, ies_id, matricula=200, egresados=80,
                 costo=None, plan_skills=None):
    c = Carrera(nombre_norm=str(uuid.uuid4()))
    session.add(c)
    session.flush()
    cie = CarreraIES(
        carrera_id=c.id,
        ies_id=ies_id,
        ciclo="2024/2",
        matricula=matricula,
        egresados=egresados,
        costo_anual_mxn=costo,
        plan_estudio_skills=json.dumps(plan_skills) if plan_skills is not None else None,
    )
    session.add(cie)
    session.flush()
    return cie


def test_calcular_tra_promedio_correcto(session):
    ies = _ies(session)
    cies = [
        _carrera_ies(session, ies.id, matricula=200, egresados=100),
        _carrera_ies(session, ies.id, matricula=200, egresados=60),
    ]
    # total_egr=160, total_mat=400 → 0.4
    assert calcular_tra(cies) == pytest.approx(0.4, abs=0.01)


def test_calcular_tra_sin_matricula_retorna_cero(session):
    ies = _ies(session)
    cies = [_carrera_ies(session, ies.id, matricula=0, egresados=0)]
    assert calcular_tra(cies) == 0.0


def test_calcular_irf_usa_costo_anual(session):
    ies = _ies(session)
    cies = [
        _carrera_ies(session, ies.id, costo=40000),
        _carrera_ies(session, ies.id, costo=40000),
    ]
    # avg=40000, ref=80000 → 0.5
    assert calcular_irf(cies) == pytest.approx(0.5, abs=0.01)


def test_calcular_irf_sin_costo_retorna_default(session):
    ies = _ies(session)
    cies = [_carrera_ies(session, ies.id, costo=None)]
    assert calcular_irf(cies) == pytest.approx(0.5, abs=0.01)


def test_calcular_cad_parcial(session):
    ies = _ies(session)
    cies = [
        _carrera_ies(session, ies.id, plan_skills=["Python", "SQL"]),
        _carrera_ies(session, ies.id, plan_skills=None),
    ]
    # 1 con skills / 2 total = 0.5
    assert calcular_cad(cies) == pytest.approx(0.5, abs=0.01)


def test_calcular_d4_score_en_rango(session):
    ies = _ies(session)
    _carrera_ies(session, ies.id, matricula=200, egresados=100, costo=60000,
                 plan_skills=["Python"])
    result = calcular_d4(ies.id, session)
    assert 0.0 <= result.score <= 1.0
    assert 0.0 <= result.tra <= 1.0
    assert 0.0 <= result.irf <= 1.0
    assert 0.0 <= result.cad <= 1.0

import json
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from pipeline.db.models import Base, Carrera, CarreraIES, Vacante, Ocupacion
from pipeline.kpi_engine.d1_obsolescencia import D1Result
from pipeline.kpi_engine.d2_oportunidades import D2Result
from pipeline.kpi_engine.d6_estudiantil import (
    calcular_iei, calcular_crc, calcular_roi_e, calcular_d6,
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


def _cie(session, egresados=80, matricula=200):
    c = Carrera(nombre_norm="Finanzas", onet_codes_relacionados=json.dumps(["13-2051.00"]))
    session.add(c)
    session.flush()
    cie = CarreraIES(
        carrera_id=c.id,
        ciclo="2024/2",
        matricula=matricula,
        egresados=egresados,
        plan_estudio_skills=json.dumps(["Excel", "Python"]),
    )
    session.add(cie)
    session.flush()
    return c, cie


def _d1(iva=0.4):
    return D1Result(iva=iva, bes=0.5, vac=0.5, score=0.45)


def _d2(ioe=0.3):
    return D2Result(ioe=ioe, ihe=0.2, iea=0.3, score=0.27)


def test_calcular_iei_rango(session):
    c, cie = _cie(session, egresados=80, matricula=200)
    d1 = _d1(iva=0.4)
    d2 = _d2(ioe=0.3)
    iei = calcular_iei(cie, d1, d2)
    # (1-0.4) * (80/200) * (1+0.3) = 0.6 * 0.4 * 1.3 = 0.312
    assert iei == pytest.approx(0.312, abs=0.01)
    assert 0.0 <= iei <= 1.0


def test_calcular_iei_clamp_maximo(session):
    c, cie = _cie(session, egresados=200, matricula=100)  # egresados > matricula posible en datos
    d1 = _d1(iva=0.0)
    d2 = _d2(ioe=1.0)
    iei = calcular_iei(cie, d1, d2)
    assert iei <= 1.0


def test_calcular_crc_formula(session):
    c, cie = _cie(session, egresados=80, matricula=200)
    d1 = _d1(iva=0.6)
    crc = calcular_crc(cie, d1)
    # 0.6 * (1 - 80/200) = 0.6 * 0.6 = 0.36
    assert crc == pytest.approx(0.36, abs=0.01)
    assert 0.0 <= crc <= 1.0


def test_calcular_roi_e_con_vacantes(session):
    c, cie = _cie(session, egresados=80, matricula=200)
    session.add(Vacante(titulo="Analista", sector="Finanzas",
                        skills=json.dumps([]), salario_min=20000, fuente="test"))
    session.add(Vacante(titulo="Dev", sector="Finanzas",
                        skills=json.dumps([]), salario_min=30000, fuente="test"))
    session.flush()
    d1 = _d1(iva=0.4)
    roi = calcular_roi_e(cie, d1, session, sector="Finanzas")
    # sal_esperado=25000, p_empleo=0.4, (1-0.4)=0.6, costo=50000
    # roi = (25000*0.4*0.6)/50000 = 6000/50000 = 0.12
    assert roi == pytest.approx(0.12, abs=0.01)
    assert 0.0 <= roi <= 1.0


def test_calcular_roi_e_sin_vacantes_usa_fallback(session):
    c, cie = _cie(session, egresados=80, matricula=200)
    occ = Ocupacion(onet_code="13-2051.00", nombre="Analista", salario_mediana_usd=55000)
    session.add(occ)
    session.flush()
    d1 = _d1(iva=0.4)
    roi = calcular_roi_e(cie, d1, session, onet_codes=["13-2051.00"])
    assert roi > 0.0
    assert roi <= 1.0


def test_calcular_d6_score_en_rango(session):
    c, cie = _cie(session)
    d1 = _d1()
    d2 = _d2()
    result = calcular_d6(c, cie, d1, d2, session)
    assert 0.0 <= result.score <= 1.0
    assert 0.0 <= result.iei <= 1.0
    assert 0.0 <= result.crc <= 1.0
    assert 0.0 <= result.roi_e <= 1.0

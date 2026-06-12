# tests/kpi_engine/test_iva_v2.py
import json

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from pipeline.db.models import Base, Carrera, CarreraIES
from pipeline.db.models_iex import CarreraSocMap, ExposicionIEX, FASectorial
from pipeline.kpi_engine.d1_iva_v2 import FA_DEFAULT, calcular_iva_v2
from pipeline.kpi_engine.kpi_runner import run_kpis


@pytest.fixture
def session():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    s = Session()
    yield s
    s.rollback()
    s.close()


def _carrera(session, nombre="Ingeniería en Sistemas"):
    c = Carrera(nombre_norm=nombre,
                onet_codes_relacionados=json.dumps(["15-1252.00"]))
    session.add(c)
    session.flush()
    return c


def _exposicion(session, soc, iex_v1=None, iex_v2=None, elasticidad=None):
    session.add(ExposicionIEX(soc_code=soc, iex_v1=iex_v1, iex_v2=iex_v2,
                              elasticidad_mx=elasticidad))
    session.flush()


def _mapeo(session, carrera, soc, peso=1.0):
    session.add(CarreraSocMap(carrera_id=carrera.id, soc_code=soc, peso=peso))
    session.flush()


def test_sin_mapeo_soc_retorna_none(session):
    c = _carrera(session)
    r = calcular_iva_v2(c, session)
    assert r.iva_v2 is None
    assert r.n_soc == 0


def test_mapeo_sin_datos_iex_retorna_none(session):
    c = _carrera(session)
    _mapeo(session, c, "15-1252")
    r = calcular_iva_v2(c, session)
    assert r.iva_v2 is None
    assert r.n_soc == 0


def test_un_soc_e_alta(session):
    c = _carrera(session)
    _exposicion(session, "15-1252", iex_v2=6.0, elasticidad="E-Alta")
    _mapeo(session, c, "15-1252")
    r = calcular_iva_v2(c, session)
    # iex_norm=0.6, FES E-Alta=0.5, FA=0.25 → 0.6 × 0.5 × 0.75 = 0.225
    assert r.iex_norm == pytest.approx(0.6)
    assert r.fes_factor == pytest.approx(0.5)
    assert r.fa == FA_DEFAULT
    assert r.iva_v2 == pytest.approx(0.225)
    assert r.n_soc == 1
    assert r.soc_codes == ["15-1252"]


def test_fallback_a_iex_v1_cuando_v2_es_null(session):
    c = _carrera(session)
    _exposicion(session, "15-1252", iex_v1=8.0, iex_v2=None, elasticidad="E-Baja")
    _mapeo(session, c, "15-1252")
    r = calcular_iva_v2(c, session)
    # iex_norm=0.8, FES E-Baja=0 → 0.8 × 1.0 × 0.75 = 0.6
    assert r.iva_v2 == pytest.approx(0.6)


def test_elasticidad_desconocida_no_descuenta(session):
    c = _carrera(session)
    _exposicion(session, "15-1252", iex_v2=4.0, elasticidad=None)
    _mapeo(session, c, "15-1252")
    r = calcular_iva_v2(c, session)
    assert r.fes_factor == pytest.approx(0.0)
    assert r.iva_v2 == pytest.approx(0.4 * 0.75)


def test_promedio_ponderado_por_peso(session):
    c = _carrera(session)
    _exposicion(session, "15-1252", iex_v2=10.0, elasticidad="E-Alta")
    _exposicion(session, "43-3031", iex_v2=6.0, elasticidad="E-Baja")
    _mapeo(session, c, "15-1252", peso=3.0)
    _mapeo(session, c, "43-3031", peso=1.0)
    r = calcular_iva_v2(c, session)
    # iex_norm = (3·10 + 1·6)/4/10 = 0.9 ; fes = (3·0.5 + 1·0)/4 = 0.375
    # iva = 0.9 × 0.625 × 0.75 = 0.4219
    assert r.iex_norm == pytest.approx(0.9)
    assert r.fes_factor == pytest.approx(0.375)
    assert r.iva_v2 == pytest.approx(0.4219, abs=1e-4)
    assert r.n_soc == 2


def test_fa_sectorial_sustituye_constante(session):
    c = _carrera(session)
    _exposicion(session, "15-1252", iex_v2=6.0, elasticidad="E-Alta")
    _mapeo(session, c, "15-1252")
    session.add(FASectorial(grupo_soc="15", fa=0.10))
    session.flush()
    r = calcular_iva_v2(c, session)
    # 0.6 × 0.5 × (1−0.10) = 0.27 (vs 0.225 con la constante 0.25)
    assert r.fa == pytest.approx(0.10)
    assert r.fa_fuente == "sectorial"
    assert r.iva_v2 == pytest.approx(0.27)


def test_fa_mixta_promedia_y_marca_fuente(session):
    c = _carrera(session)
    _exposicion(session, "15-1252", iex_v2=6.0, elasticidad="E-Baja")
    _exposicion(session, "99-0001", iex_v2=6.0, elasticidad="E-Baja")
    _mapeo(session, c, "15-1252")
    _mapeo(session, c, "99-0001")   # grupo 99 sin fila → FA_DEFAULT
    session.add(FASectorial(grupo_soc="15", fa=0.10))
    session.flush()
    r = calcular_iva_v2(c, session)
    assert r.fa == pytest.approx((0.10 + FA_DEFAULT) / 2)
    assert r.fa_fuente == "mixta"


def test_sin_filas_fa_usa_constante(session):
    c = _carrera(session)
    _exposicion(session, "15-1252", iex_v2=6.0, elasticidad="E-Alta")
    _mapeo(session, c, "15-1252")
    r = calcular_iva_v2(c, session)
    assert r.fa == pytest.approx(FA_DEFAULT)
    assert r.fa_fuente == "constante"


def test_resultado_acotado_a_uno(session):
    c = _carrera(session)
    _exposicion(session, "15-1252", iex_v2=10.0, elasticidad="E-Baja")
    _mapeo(session, c, "15-1252")
    r = calcular_iva_v2(c, session)
    assert 0.0 <= r.iva_v2 <= 1.0


def test_kpi_runner_incluye_iva_v2_sin_tocar_v1(session):
    c = _carrera(session)
    cie = CarreraIES(carrera_id=c.id, ciclo="2026/1", matricula=100,
                     egresados=50, plan_estudio_skills=json.dumps(["Python"]))
    session.add(cie)
    _exposicion(session, "15-1252", iex_v2=5.769, elasticidad="E-Alta")
    _mapeo(session, c, "15-1252")
    session.flush()

    result = run_kpis(c.id, session)
    assert result is not None
    # v1 intacto (sin Ocupacion → default 0.5 de siempre)
    assert result.d1_obsolescencia.iva == pytest.approx(0.5)
    # v2 en paralelo, derivado del IEX
    assert result.iva_v2.iva_v2 == pytest.approx(0.5769 * 0.5 * 0.75, abs=1e-4)


def test_kpi_runner_iva_v2_none_si_sin_crosswalk(session):
    c = _carrera(session)
    cie = CarreraIES(carrera_id=c.id, ciclo="2026/1", matricula=100,
                     egresados=50, plan_estudio_skills=json.dumps(["Python"]))
    session.add(cie)
    session.flush()
    result = run_kpis(c.id, session)
    assert result is not None
    assert result.iva_v2.iva_v2 is None

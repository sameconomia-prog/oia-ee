# tests/services/test_contexto_mx.py
import json

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from pipeline.db.models import Base, Carrera
from pipeline.db.models_iex import CarreraSocMap, ContextoOcupacionMX, ExposicionIEX
from pipeline.services.contexto_mx import contexto_carrera


@pytest.fixture
def session():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    s = Session()
    yield s
    s.rollback()
    s.close()


def _carrera(session, soc="29-1141", **ctx):
    c = Carrera(nombre_norm=f"carrera {soc}",
                onet_codes_relacionados=json.dumps([f"{soc}.00"]))
    session.add(c)
    session.flush()
    session.add(CarreraSocMap(carrera_id=c.id, soc_code=soc))
    session.add(ContextoOcupacionMX(soc_code=soc, **ctx))
    session.flush()
    return c


def test_sin_mapeo_retorna_vacio(session):
    c = Carrera(nombre_norm="sin mapeo", onet_codes_relacionados=json.dumps([]))
    session.add(c)
    session.flush()
    r = contexto_carrera(c, session)
    assert r.n_soc == 0
    assert r.empleo_mx is None


def test_agrega_variables_de_una_ocupacion(session):
    c = _carrera(session, empleo_mx=700000, ingreso_mensual_mxn=9000.0,
                 pct_informalidad=12.0, pct_mujeres=85.0,
                 escolaridad_anios=14.8, pct_rural=18.0)
    r = contexto_carrera(c, session)
    assert r.n_soc == 1
    assert r.empleo_mx == 700000
    assert r.pct_mujeres == pytest.approx(85.0)
    assert "feminizada" in r.flags


def test_promedio_ponderado_dos_ocupaciones(session):
    c = _carrera(session, soc="43-3031", pct_mujeres=70.0, empleo_mx=100)
    session.add(ContextoOcupacionMX(soc_code="15-1252", pct_mujeres=20.0, empleo_mx=300))
    session.add(CarreraSocMap(carrera_id=c.id, soc_code="15-1252", peso=3.0))
    session.flush()
    r = contexto_carrera(c, session)
    # (1×70 + 3×20)/4 = 32.5 ; empleo = 100+300
    assert r.pct_mujeres == pytest.approx(32.5)
    assert r.empleo_mx == 400
    assert "feminizada" not in r.flags


def test_alerta_distributiva_requiere_riesgo_y_flag(session):
    # Feminizada + riesgo alto (iex 9 E-Baja → iva_v2 0.675 ≥ 0.35) → alerta
    c = _carrera(session, pct_mujeres=85.0)
    session.add(ExposicionIEX(soc_code="29-1141", iex_v2=9.0, elasticidad_mx="E-Baja"))
    session.flush()
    r = contexto_carrera(c, session)
    assert r.alerta_distributiva is True
    assert "femenina" in r.nota


def test_sin_riesgo_no_hay_alerta_aunque_haya_flag(session):
    # Feminizada pero iex 2 E-Alta → iva_v2 0.075 < 0.35 → sin alerta
    c = _carrera(session, pct_mujeres=85.0)
    session.add(ExposicionIEX(soc_code="29-1141", iex_v2=2.0, elasticidad_mx="E-Alta"))
    session.flush()
    r = contexto_carrera(c, session)
    assert "feminizada" in r.flags
    assert r.alerta_distributiva is False
    assert r.nota is None

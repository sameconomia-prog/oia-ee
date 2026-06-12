# tests/scenario_engine/test_escenarios_macro.py
import json

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from pipeline.db.models import Base, Carrera
from pipeline.db.models_iex import CarreraSocMap, ExposicionIEX
from pipeline.scenario_engine.escenarios_macro import proyectar_escenarios


@pytest.fixture
def session():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    s = Session()
    yield s
    s.rollback()
    s.close()


def _carrera(session, iex_v2=6.0, elasticidad="E-Media", dim_d7=None, soc="15-1252"):
    c = Carrera(nombre_norm=f"carrera {soc}",
                onet_codes_relacionados=json.dumps([f"{soc}.00"]))
    session.add(c)
    session.flush()
    session.add(ExposicionIEX(soc_code=soc, iex_v2=iex_v2,
                              elasticidad_mx=elasticidad, dim_d7=dim_d7))
    session.add(CarreraSocMap(carrera_id=c.id, soc_code=soc))
    session.flush()
    return c


def test_sin_datos_iex_no_proyecta(session):
    c = Carrera(nombre_norm="sin datos", onet_codes_relacionados=json.dumps([]))
    session.add(c)
    session.flush()
    r = proyectar_escenarios(c, session)
    assert r.iva_actual is None
    assert r.proyecciones == []


def test_proyecta_3_escenarios_2_horizontes(session):
    c = _carrera(session)
    r = proyectar_escenarios(c, session)
    assert r.iva_actual is not None
    assert len(r.proyecciones) == 6
    assert {p.escenario for p in r.proyecciones} == {"continuista", "polarizacion", "disruptivo"}
    assert all(0.0 <= p.iva_proyectado <= 1.0 for p in r.proyecciones)


def test_disruptivo_supera_a_continuista(session):
    c = _carrera(session, iex_v2=6.0, elasticidad="E-Alta")
    r = proyectar_escenarios(c, session)
    por = {(p.escenario, p.anio): p.iva_proyectado for p in r.proyecciones}
    assert por[("disruptivo", 2030)] > por[("continuista", 2030)]
    assert por[("disruptivo", 2035)] > por[("continuista", 2035)]


def test_polarizacion_escala_con_trc(session):
    alta_trc = _carrera(session, dim_d7=9.0, soc="43-3031")
    baja_trc = _carrera(session, dim_d7=1.0, soc="29-1141")
    r_alta = proyectar_escenarios(alta_trc, session)
    r_baja = proyectar_escenarios(baja_trc, session)
    pol_alta = next(p.iva_proyectado for p in r_alta.proyecciones
                    if p.escenario == "polarizacion" and p.anio == 2035)
    pol_baja = next(p.iva_proyectado for p in r_baja.proyecciones
                    if p.escenario == "polarizacion" and p.anio == 2035)
    assert pol_alta > pol_baja


def test_rango_contiene_min_y_max(session):
    c = _carrera(session)
    r = proyectar_escenarios(c, session)
    vals_2030 = [p.iva_proyectado for p in r.proyecciones if p.anio == 2030]
    assert r.rango_2030 == (min(vals_2030), max(vals_2030))
    assert r.rango_2030[0] <= r.rango_2030[1]


def test_2035_no_baja_respecto_a_2030_en_mismo_escenario(session):
    c = _carrera(session)
    r = proyectar_escenarios(c, session)
    por = {(p.escenario, p.anio): p.iva_proyectado for p in r.proyecciones}
    for esc in ("continuista", "polarizacion", "disruptivo"):
        assert por[(esc, 2035)] >= por[(esc, 2030)]

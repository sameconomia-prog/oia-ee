# tests/services/test_recomendacion.py
import json

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from pipeline.db.models import Base, Carrera
from pipeline.db.models_iex import CarreraSocMap, ExposicionIEX
from pipeline.services.recomendacion import recomendar


@pytest.fixture
def session():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    s = Session()
    yield s
    s.rollback()
    s.close()


def _carrera_con_iex(session, iex_v2, elasticidad, soc="15-1252"):
    c = Carrera(nombre_norm=f"carrera {soc}",
                onet_codes_relacionados=json.dumps([f"{soc}.00"]))
    session.add(c)
    session.flush()
    session.add(ExposicionIEX(soc_code=soc, iex_v2=iex_v2, elasticidad_mx=elasticidad))
    session.add(CarreraSocMap(carrera_id=c.id, soc_code=soc))
    session.flush()
    return c


def test_riesgo_alto_e_baja_escala_a_fusion_cierre(session):
    # iex 9.0, E-Baja: iva_v2 = 0.9 × 1.0 × 0.75 = 0.675 ≥ 0.50
    c = _carrera_con_iex(session, iex_v2=9.0, elasticidad="E-Baja")
    r = recomendar(c, session)
    assert r.accion == "evaluar_fusion_cierre"
    assert r.fuente_riesgo == "iva_v2"
    assert r.confianza == "alta"
    assert len(r.acciones) == 3


def test_riesgo_alto_con_elasticidad_recomienda_redisenar(session):
    # iex 10, E-Media: 1.0 × 0.75 × 0.75 = 0.5625 ≥ 0.50 pero no E-Baja
    c = _carrera_con_iex(session, iex_v2=10.0, elasticidad="E-Media")
    r = recomendar(c, session)
    assert r.accion == "redisenar"


def test_riesgo_medio_recomienda_actualizar(session):
    # iex 6, E-Media: 0.6 × 0.75 × 0.75 = 0.3375
    c = _carrera_con_iex(session, iex_v2=6.0, elasticidad="E-Media")
    r = recomendar(c, session)
    assert r.accion == "actualizar"


def test_riesgo_bajo_recomienda_mantener(session):
    # iex 3, E-Alta: 0.3 × 0.5 × 0.75 = 0.1125
    c = _carrera_con_iex(session, iex_v2=3.0, elasticidad="E-Alta")
    r = recomendar(c, session)
    assert r.accion == "mantener"


def test_sin_mapeo_cae_a_iva_v1_con_confianza_media(session):
    c = Carrera(nombre_norm="carrera solo onet",
                onet_codes_relacionados=json.dumps(["99-1111.00"]))
    session.add(c)
    session.flush()
    r = recomendar(c, session)
    # iva_v1 default 0.5 (sin Ocupacion) → riesgo alto, fuente v1, confianza media
    assert r.fuente_riesgo == "iva_v1"
    assert r.confianza == "media"
    assert r.riesgo_base == pytest.approx(0.5)


def test_sin_codes_retorna_sin_datos(session):
    c = Carrera(nombre_norm="carrera vacía", onet_codes_relacionados=json.dumps([]))
    session.add(c)
    session.flush()
    r = recomendar(c, session)
    assert r.accion == "sin_datos"
    assert r.riesgo_base is None

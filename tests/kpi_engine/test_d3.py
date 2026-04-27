import json
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from pipeline.db.models import Base, Carrera, CarreraIES, Noticia, Vacante
from pipeline.kpi_engine.d3_mercado import (
    calcular_tdm, calcular_tvc, calcular_brs, calcular_ice, calcular_d3,
)

EMERGING_SKILLS_D3 = {"python", "machine learning", "ia", "inteligencia artificial",
                      "cloud", "data science", "nlp", "deep learning", "llm"}


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


def _noticia_despido(session, sector="Tecnología", n=100):
    n_obj = Noticia(
        titulo=f"Empresa despide {n}",
        url=f"http://test/{id(sector)}/{n}",
        tipo_impacto="despido",
        sector=sector,
        n_empleados=n,
    )
    session.add(n_obj)
    session.flush()
    return n_obj


def _vacante(session, sector="Tecnología", skills=None):
    v = Vacante(
        titulo="Dev",
        sector=sector,
        skills=json.dumps(skills or []),
        fuente="test",
    )
    session.add(v)
    session.flush()
    return v


def test_calcular_tdm_con_datos(session):
    _noticia_despido(session, sector="Tecnología")
    _vacante(session, sector="Tecnología")
    _vacante(session, sector="Tecnología")
    tdm = calcular_tdm(session, sector="Tecnología")
    # 1 despido / 2 vacantes = 0.5
    assert tdm == pytest.approx(0.5, abs=0.01)


def test_calcular_tdm_sin_vacantes_retorna_cero(session):
    tdm = calcular_tdm(session, sector="Tecnología")
    assert tdm == 0.0


def test_calcular_tvc_mayor_uno_es_positivo(session):
    _noticia_despido(session, sector="IT")
    _vacante(session, sector="IT", skills=["python", "ia"])
    _vacante(session, sector="IT", skills=["machine learning"])
    _vacante(session, sector="IT", skills=["cloud"])
    tvc = calcular_tvc(session, sector="IT")
    # 3 vacantes IA / 1 despido = 3.0
    assert tvc == pytest.approx(3.0, abs=0.01)


def test_calcular_brs_con_skills_faltantes(session):
    cie = _cie(session, plan_skills=["Python", "SQL", "Derecho"])
    _vacante(session, skills=["Python", "Docker"])
    brs = calcular_brs(cie, session)
    # plan=[python, sql, derecho], demanded=[python, docker]
    # missing=[sql, derecho] → 2/3 ≈ 0.667
    assert brs == pytest.approx(2 / 3, abs=0.01)


def test_calcular_ice_ratio_correcto(session):
    _vacante(session, sector="Finanzas", skills=["python", "ia"])
    _vacante(session, sector="Finanzas", skills=["Excel", "Word"])
    ice = calcular_ice(session, sector="Finanzas")
    assert ice == pytest.approx(0.5, abs=0.01)


def test_calcular_d3_score_en_rango(session):
    cie = _cie(session, plan_skills=["Python", "Contabilidad"])
    _noticia_despido(session, sector="Finanzas")
    _vacante(session, sector="Finanzas", skills=["python"])
    result = calcular_d3(cie, session, sector="Finanzas")
    assert 0.0 <= result.score <= 1.0
    assert 0.0 <= result.tdm <= 1.0
    assert result.tvc >= 0.0
    assert 0.0 <= result.brs <= 1.0
    assert 0.0 <= result.ice <= 1.0


from pipeline.db.models_enoe import IndicadorENOE
from pipeline.kpi_engine.d3_mercado import calcular_factor_macro


def test_factor_macro_retorna_uno_sin_datos_enoe(session):
    factor = calcular_factor_macro(session)
    assert factor == 1.0


def test_factor_macro_tasa_igual_referencia(session):
    session.add(IndicadorENOE(
        estado="Nacional", anio=2025, trimestre=1, tasa_desempleo=3.5,
    ))
    session.flush()
    factor = calcular_factor_macro(session)
    assert factor == pytest.approx(1.0, abs=0.001)


def test_factor_macro_tasa_alta_amplifica(session):
    session.add(IndicadorENOE(
        estado="Nacional", anio=2025, trimestre=1, tasa_desempleo=7.0,
    ))
    session.flush()
    factor = calcular_factor_macro(session)
    assert factor == pytest.approx(2.0, abs=0.001)


def test_calcular_tdm_aplica_factor_macro(session):
    # Insertar tasa alta → TDM se amplifica
    session.add(IndicadorENOE(
        estado="Nacional", anio=2025, trimestre=1, tasa_desempleo=7.0,
    ))
    _noticia_despido(session, sector="Tech")
    _vacante(session, sector="Tech")
    _vacante(session, sector="Tech")
    session.flush()
    tdm = calcular_tdm(session, sector="Tech")
    # sin factor: 1/2 = 0.5; con factor 2.0: min(1.0, 0.5*2.0) = 1.0
    assert tdm == 1.0

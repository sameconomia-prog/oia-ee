import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from pipeline.db.models import Base, IES, CarreraIES, Carrera, Noticia, Vacante
from pipeline.kpi_engine.d5_geografia import (
    calcular_idr, calcular_icg, calcular_ies_s, calcular_d5,
)
from pipeline.kpi_engine.kpi_runner import run_kpis_estado


@pytest.fixture
def session():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    s = Session()
    yield s
    s.rollback()
    s.close()


def test_idr_sin_datos_es_cero(session):
    idr = calcular_idr("Jalisco", session)
    assert idr == 0.0


def test_idr_sube_con_despidos_nacionales(session):
    ies = IES(nombre="TEC GDL", estado="Jalisco", matricula_total=10_000)
    session.add(ies)
    for i in range(50):
        n = Noticia(titulo=f"Despido {i}", url=f"http://x.com/{i}",
                    fuente="test", causa_ia="automatización")
        session.add(n)
    session.flush()
    idr = calcular_idr("Jalisco", session)
    # 50 nacionales / 10000 * 1000 = 5.0 → min(1.0, 5.0/5.0) = 1.0
    assert idr == 1.0


def test_icg_sin_ies_retorna_fallback(session):
    icg = calcular_icg("Oaxaca", session)
    assert icg == 0.5


def test_icg_con_una_ies_moderna_de_dos(session):
    ies1 = IES(nombre="UNAM Oaxaca", estado="Oaxaca", activa=True)
    ies2 = IES(nombre="TEC Oaxaca", estado="Oaxaca", activa=True)
    session.add_all([ies1, ies2])
    c = Carrera(nombre_norm="Ing. Sistemas Oaxaca")
    session.add(c)
    session.flush()
    cie = CarreraIES(carrera_id=c.id, ies_id=ies1.id, ciclo="2024/2",
                     matricula=100, plan_estudio_skills='["Python"]')
    session.add(cie)
    session.flush()
    icg = calcular_icg("Oaxaca", session)
    assert icg == 0.5  # 1 de 2


def test_ies_s_sin_datos_es_punto_cinco(session):
    ies_s = calcular_ies_s("Sonora", session)
    assert ies_s == 0.5


def test_ies_s_con_vacantes_locales(session):
    for i in range(10):
        v = Vacante(titulo=f"Dev {i}", estado="Sonora")
        session.add(v)
    session.flush()
    ies_s = calcular_ies_s("Sonora", session)
    # vacantes=10, despidos_nacionales=0 → raw=(10-0)/11 → centrado > 0.5
    assert ies_s > 0.5


def test_calcular_d5_estado_vacio_retorna_defaults(session):
    result = calcular_d5("Yucatán", session)
    assert 0.0 <= result.idr <= 1.0
    assert 0.0 <= result.icg <= 1.0
    assert 0.0 <= result.ies_s <= 1.0
    assert 0.0 <= result.score <= 1.0


def test_run_kpis_estado_siempre_retorna(session):
    result = run_kpis_estado("Tamaulipas", session)
    assert result is not None
    assert result.estado == "Tamaulipas"
    assert 0.0 <= result.d5_geografia.score <= 1.0

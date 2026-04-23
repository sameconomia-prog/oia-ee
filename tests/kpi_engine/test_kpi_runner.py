# tests/kpi_engine/test_kpi_runner.py
import json
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from pipeline.db.models import Base, Carrera, CarreraIES, Ocupacion
from pipeline.kpi_engine.kpi_runner import run_kpis
from pipeline.kpi_engine.d3_mercado import D3Result
from pipeline.kpi_engine.d6_estudiantil import D6Result


@pytest.fixture
def session():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    s = Session()
    yield s
    s.rollback()
    s.close()


def test_run_kpis_retorna_ambas_dimensiones(session):
    c = Carrera(nombre_norm="Ing. Sistemas", onet_codes_relacionados=json.dumps(["15-1252.00"]))
    session.add(c)
    occ = Ocupacion(onet_code="15-1252.00", nombre="Dev", p_automatizacion=0.30)
    session.add(occ)
    session.flush()
    cie = CarreraIES(carrera_id=c.id, ciclo="2024/2", matricula=400, egresados=80,
                     plan_estudio_skills=json.dumps(["Python", "SQL"]))
    session.add(cie)
    session.flush()
    result = run_kpis(c.id, session)
    assert result is not None
    assert 0.0 <= result.d1_obsolescencia.score <= 1.0
    assert 0.0 <= result.d2_oportunidades.score <= 1.0


def test_run_kpis_carrera_no_existe_retorna_none(session):
    result = run_kpis("id-inexistente", session)
    assert result is None


def test_run_kpis_incluye_d3_y_d6(session):
    c = Carrera(nombre_norm="Ing. Sistemas", onet_codes_relacionados=json.dumps(["15-1252.00"]))
    session.add(c)
    occ = Ocupacion(onet_code="15-1252.00", nombre="Dev", p_automatizacion=0.30,
                    sector="Tecnología")
    session.add(occ)
    session.flush()
    cie = CarreraIES(carrera_id=c.id, ciclo="2024/2", matricula=400, egresados=80,
                     plan_estudio_skills=json.dumps(["Python", "SQL"]))
    session.add(cie)
    session.flush()
    result = run_kpis(c.id, session)
    assert result is not None
    assert 0.0 <= result.d3_mercado.score <= 1.0
    assert 0.0 <= result.d6_estudiantil.score <= 1.0

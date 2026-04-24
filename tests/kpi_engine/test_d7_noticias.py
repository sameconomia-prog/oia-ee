import pytest
from datetime import datetime, timedelta, timezone, date
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from pipeline.db.models import Base, Noticia, Vacante
from pipeline.kpi_engine.d7_noticias import calcular_isn, calcular_vdm, calcular_d7, _pearson
from pipeline.kpi_engine.kpi_runner import run_kpis_noticias


@pytest.fixture
def session():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    s = Session()
    yield s
    s.rollback()
    s.close()


def test_pearson_correlacion_perfecta():
    assert _pearson([1, 2, 3], [2, 4, 6]) == pytest.approx(1.0)


def test_pearson_series_iguales_retorna_cero_por_dy():
    assert _pearson([1, 2, 3], [5, 5, 5]) == 0.0


def test_pearson_menos_de_dos_puntos():
    assert _pearson([1], [2]) == 0.0


def test_isn_sin_datos_retorna_fallback(session):
    isn = calcular_isn(session)
    assert isn == 0.5


def test_isn_con_datos_insuficientes_por_sector(session):
    # Solo 1 semana de noticias por sector → no hay lag posible
    now = datetime.now(timezone.utc)
    n = Noticia(titulo="Test", url="http://t.com/1", fuente="t",
                sector="Tecnología", fecha_pub=now)
    session.add(n)
    v = Vacante(titulo="Dev", sector="Tecnología", fecha_pub=date.today())
    session.add(v)
    session.flush()
    isn = calcular_isn(session)
    assert isn == 0.5  # sin datos suficientes → fallback


def test_vdm_sin_noticias_recientes(session):
    # Noticia antigua (> 72h)
    old = datetime.now(timezone.utc) - timedelta(hours=100)
    n = Noticia(titulo="Vieja", url="http://t.com/old", fuente="t", fecha_pub=old)
    session.add(n)
    session.flush()
    vdm = calcular_vdm(session)
    assert vdm == 0.0


def test_vdm_con_noticias_recientes(session):
    now = datetime.now(timezone.utc)
    for i in range(10):
        n = Noticia(titulo=f"Recent {i}", url=f"http://t.com/r{i}",
                    fuente="t", fecha_pub=now - timedelta(hours=i))
        session.add(n)
    session.flush()
    vdm = calcular_vdm(session)
    # 10 noticias / 72h ≈ 0.139/h → normalizado = min(1.0, 0.139/5) ≈ 0.028
    assert vdm > 0.0
    assert vdm <= 1.0


def test_calcular_d7_retorna_rango_valido(session):
    result = calcular_d7(session)
    assert 0.0 <= result.isn <= 1.0
    assert 0.0 <= result.vdm <= 1.0
    assert 0.0 <= result.score <= 1.0


def test_run_kpis_noticias_siempre_retorna(session):
    result = run_kpis_noticias(session)
    assert result is not None
    assert 0.0 <= result.d7_noticias.score <= 1.0

from pipeline.db.models import Noticia, Vacante, Ocupacion, IES, Carrera, CarreraIES, KpiHistorico, Alerta, Escenario
import uuid

def test_noticia_create(session):
    n = Noticia(titulo="IA desplaza 10k empleos", url="https://t.co/1", fuente="rss_techcrunch")
    session.add(n)
    session.flush()
    assert n.id is not None

def test_all_tables_exist(engine):
    from sqlalchemy import inspect
    tables = inspect(engine).get_table_names()
    expected = {"noticias","vacantes","ocupaciones","ies","carreras","carrera_ies","kpi_historico","alertas","escenarios"}
    assert expected.issubset(set(tables))

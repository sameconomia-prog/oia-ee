# tests/api/test_noticias.py
from pipeline.db.models import Noticia


def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_list_noticias_vacio(client):
    resp = client.get("/noticias/")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_list_noticias_con_datos(client, db_session):
    n = Noticia(titulo="IA despide 1000", url="https://t.co/api1", fuente="rss", sector="tecnologia")
    db_session.add(n)
    db_session.flush()
    resp = client.get("/noticias/")
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


def test_get_noticia_not_found(client):
    resp = client.get("/noticias/id-inexistente")
    assert resp.status_code == 404


def test_filter_por_sector(client, db_session):
    n = Noticia(titulo="Salud IA", url="https://t.co/api-salud1", fuente="rss", sector="salud")
    db_session.add(n)
    db_session.flush()
    resp = client.get("/noticias/?sector=salud")
    assert resp.status_code == 200
    data = resp.json()
    assert any(item["sector"] == "salud" for item in data)

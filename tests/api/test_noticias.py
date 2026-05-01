# tests/api/test_noticias.py
import json
from unittest.mock import patch
from pipeline.db.models import Noticia


def test_health(client):
    resp = client.get("/health")
    assert resp.status_code in (200, 503)
    assert "status" in resp.json()


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


def test_get_noticia_con_datos(client, db_session):
    n = Noticia(titulo="Test detalle", url="https://t.co/det1", fuente="rss",
                resumen_claude="Resumen IA test", causa_ia="Automatización", n_empleados=500)
    db_session.add(n)
    db_session.flush()
    resp = client.get(f"/noticias/{n.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["titulo"] == "Test detalle"
    assert data["resumen_claude"] == "Resumen IA test"
    assert data["n_empleados"] == 500


def test_sectores_noticias_vacio(client):
    resp = client.get("/noticias/sectores")
    assert resp.status_code == 200
    assert resp.json() == []


def test_sectores_noticias_con_datos(client, db_session):
    db_session.add(Noticia(titulo="A", url="https://t.co/sn1", sector="educacion"))
    db_session.add(Noticia(titulo="B", url="https://t.co/sn2", sector="tecnologia"))
    db_session.add(Noticia(titulo="C", url="https://t.co/sn3", sector="educacion"))
    db_session.flush()
    resp = client.get("/noticias/sectores")
    assert resp.status_code == 200
    data = resp.json()
    assert "educacion" in data
    assert "tecnologia" in data
    assert data == sorted(data)


def test_filter_por_sector(client, db_session):
    n = Noticia(titulo="Salud IA", url="https://t.co/api-salud1", fuente="rss", sector="salud")
    db_session.add(n)
    db_session.flush()
    resp = client.get("/noticias/?sector=salud")
    assert resp.status_code == 200
    data = resp.json()
    assert any(item["sector"] == "salud" for item in data)


# --- GET /noticias/buscar ---

def test_buscar_sin_query_devuelve_422(client):
    resp = client.get("/noticias/buscar")
    assert resp.status_code == 422


def test_buscar_sin_voyage_key_devuelve_lista_vacia(client, monkeypatch):
    monkeypatch.delenv("VOYAGE_API_KEY", raising=False)
    resp = client.get("/noticias/buscar?q=inteligencia+artificial")
    assert resp.status_code == 200
    assert resp.json() == []


def test_buscar_devuelve_noticias_similares(client, db_session, monkeypatch):
    monkeypatch.setenv("VOYAGE_API_KEY", "test-voyage-key")
    vec_a = [1.0, 0.0, 0.0]
    vec_b = [0.0, 1.0, 0.0]
    n1 = Noticia(titulo="IA educación", url="https://t.co/buscar1", fuente="rss",
                 embedding_json=json.dumps(vec_a))
    n2 = Noticia(titulo="Finanzas globales", url="https://t.co/buscar2", fuente="rss",
                 embedding_json=json.dumps(vec_b))
    db_session.add_all([n1, n2])
    db_session.flush()

    with patch("api.routers.noticias.embed_text", return_value=vec_a):
        resp = client.get("/noticias/buscar?q=IA+educacion&top_k=1")

    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["titulo"] == "IA educación"


def test_buscar_embed_error_devuelve_lista_vacia(client, monkeypatch):
    monkeypatch.setenv("VOYAGE_API_KEY", "test-key")
    with patch("api.routers.noticias.embed_text", return_value=None):
        resp = client.get("/noticias/buscar?q=fallo")
    assert resp.status_code == 200
    assert resp.json() == []


# --- GET /noticias/?impacto= ---

def test_noticias_filtro_impacto_riesgo(client, db_session):
    db_session.add(Noticia(titulo="Noticia riesgo", url="https://t.co/imp1", fuente="rss", tipo_impacto="riesgo"))
    db_session.add(Noticia(titulo="Noticia oportunidad", url="https://t.co/imp2", fuente="rss", tipo_impacto="oportunidad"))
    db_session.add(Noticia(titulo="Noticia neutro", url="https://t.co/imp3", fuente="rss", tipo_impacto="neutro"))
    db_session.flush()
    resp = client.get("/noticias/?impacto=riesgo")
    assert resp.status_code == 200
    data = resp.json()
    assert all(n["tipo_impacto"] == "riesgo" for n in data)
    titulos = [n["titulo"] for n in data]
    assert "Noticia riesgo" in titulos
    assert "Noticia oportunidad" not in titulos


def test_noticias_filtro_impacto_oportunidad(client, db_session):
    db_session.add(Noticia(titulo="Oportunidad A", url="https://t.co/oa1", fuente="rss", tipo_impacto="oportunidad"))
    db_session.add(Noticia(titulo="Riesgo B", url="https://t.co/rb1", fuente="rss", tipo_impacto="riesgo"))
    db_session.flush()
    resp = client.get("/noticias/?impacto=oportunidad")
    assert resp.status_code == 200
    data = resp.json()
    assert all(n["tipo_impacto"] == "oportunidad" for n in data)
    titulos = [n["titulo"] for n in data]
    assert "Oportunidad A" in titulos
    assert "Riesgo B" not in titulos


# --- GET /noticias/tendencia ---

def test_noticias_tendencia_vacio(client):
    resp = client.get("/noticias/tendencia")
    assert resp.status_code == 200
    assert resp.json() == []


def test_noticias_tendencia_con_datos(client, db_session):
    from datetime import datetime
    db_session.add(Noticia(titulo="N1", url="https://t.co/t1", fuente="rss", fecha_pub=datetime(2024, 3, 10)))
    db_session.add(Noticia(titulo="N2", url="https://t.co/t2", fuente="rss", fecha_pub=datetime(2024, 3, 22)))
    db_session.add(Noticia(titulo="N3", url="https://t.co/t3", fuente="rss", fecha_pub=datetime(2024, 4, 5)))
    db_session.flush()
    resp = client.get("/noticias/tendencia")
    assert resp.status_code == 200
    data = resp.json()
    meses = [d["mes"] for d in data]
    assert "2024-03" in meses
    assert "2024-04" in meses
    mar = next(d for d in data if d["mes"] == "2024-03")
    assert mar["count"] == 2

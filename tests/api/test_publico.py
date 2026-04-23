# tests/api/test_publico.py
from pipeline.db.models import IES, Noticia, Alerta


def test_resumen_vacio(client):
    resp = client.get("/publico/resumen")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_ies"] >= 0
    assert data["total_noticias"] >= 0
    assert data["alertas_activas"] >= 0
    assert isinstance(data["noticias_recientes"], list)


def test_resumen_cuenta_ies(client, db_session):
    db_session.add(IES(nombre="IES Pública Test", nombre_corto="IPT", tipo="pública"))
    db_session.add(IES(nombre="IES Privada Test", nombre_corto="IPrivT", tipo="privada"))
    db_session.flush()
    resp = client.get("/publico/resumen")
    assert resp.status_code == 200
    assert resp.json()["total_ies"] >= 2


def test_resumen_noticias_recientes(client, db_session):
    for i in range(4):
        db_session.add(Noticia(titulo=f"Noticia {i}", url=f"https://t.co/pub{i}", fuente="rss"))
    db_session.flush()
    resp = client.get("/publico/resumen")
    data = resp.json()
    assert len(data["noticias_recientes"]) <= 5
    assert data["total_noticias"] >= 4


def test_resumen_alertas_activas(client, db_session):
    ies = IES(nombre="IES Alertas", nombre_corto="IA")
    db_session.add(ies)
    db_session.flush()
    a1 = Alerta(ies_id=ies.id, tipo="d1_alto", severidad="alta",
                titulo="D1 crítico", mensaje="test", leida=False)
    a2 = Alerta(ies_id=ies.id, tipo="d2_bajo", severidad="media",
                titulo="D2 bajo", mensaje="test", leida=True)
    db_session.add_all([a1, a2])
    db_session.flush()
    resp = client.get("/publico/resumen")
    assert resp.json()["alertas_activas"] >= 1

# tests/api/test_publico.py
import json
from pipeline.db.models import IES, Noticia, Alerta, Carrera, CarreraIES, Ocupacion


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


# --- GET /publico/carreras ---

def _seed_carrera(db_session, suffix="pub"):
    ies = IES(nombre=f"IES Pub {suffix}", nombre_corto=f"IP{suffix}")
    db_session.add(ies)
    occ = Ocupacion(onet_code=f"99-{suffix[:4].ljust(4,'0')}.00", nombre=f"Occ {suffix}", p_automatizacion=0.45)
    db_session.add(occ)
    db_session.flush()
    carrera = Carrera(
        nombre_norm=f"ingeniería publica {suffix}",
        onet_codes_relacionados=json.dumps([occ.onet_code]),
    )
    db_session.add(carrera)
    db_session.flush()
    cie = CarreraIES(
        carrera_id=carrera.id,
        ies_id=ies.id,
        ciclo="2024/2",
        matricula=100,
        egresados=20,
        plan_estudio_skills=json.dumps(["python"]),
    )
    db_session.add(cie)
    db_session.flush()
    return carrera


def test_carreras_publico_devuelve_lista(client, db_session):
    carrera = _seed_carrera(db_session, "c1")
    resp = client.get("/publico/carreras")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    ids = [c["id"] for c in data]
    assert carrera.id in ids


def test_carreras_publico_incluye_kpi(client, db_session):
    _seed_carrera(db_session, "c2")
    resp = client.get("/publico/carreras")
    data = resp.json()
    con_kpi = [c for c in data if c["kpi"] is not None]
    assert len(con_kpi) >= 1
    kpi = con_kpi[0]["kpi"]
    assert "d1_obsolescencia" in kpi
    assert "d2_oportunidades" in kpi
    assert "d3_mercado" in kpi
    assert "d6_estudiantil" in kpi


def test_carreras_publico_paginacion(client, db_session):
    _seed_carrera(db_session, "p1")
    _seed_carrera(db_session, "p2")
    resp1 = client.get("/publico/carreras?skip=0&limit=1")
    resp2 = client.get("/publico/carreras?skip=1&limit=1")
    assert resp1.status_code == 200
    assert resp2.status_code == 200
    assert len(resp1.json()) == 1
    # IDs distintos entre página 1 y página 2
    id1 = resp1.json()[0]["id"]
    id2 = resp2.json()[0]["id"] if resp2.json() else None
    if id2:
        assert id1 != id2

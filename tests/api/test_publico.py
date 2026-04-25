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


# --- GET /publico/ies ---

def test_listar_ies_publico_sin_auth(client, db_session):
    db_session.add(IES(nombre="Universidad Comparar A", nombre_corto="UCA", activa=True))
    db_session.add(IES(nombre="Universidad Comparar B", nombre_corto="UCB", activa=True))
    db_session.flush()
    resp = client.get("/publico/ies")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    nombres = [d["nombre"] for d in data]
    assert "Universidad Comparar A" in nombres
    assert "Universidad Comparar B" in nombres
    assert "id" in data[0]
    assert nombres == sorted(nombres)


def test_listar_ies_publico_solo_activas(client, db_session):
    db_session.add(IES(nombre="IES Activa", nombre_corto="IA", activa=True))
    db_session.add(IES(nombre="IES Inactiva", nombre_corto="II", activa=False))
    db_session.flush()
    resp = client.get("/publico/ies")
    assert resp.status_code == 200
    data = resp.json()
    nombres = [d["nombre"] for d in data]
    assert "IES Activa" in nombres
    assert "IES Inactiva" not in nombres


# --- GET /publico/kpis/resumen ---

def test_kpis_resumen_nacional_vacio(client):
    resp = client.get("/publico/kpis/resumen")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_carreras"] == 0
    assert data["promedio_d1"] == 0.0
    assert data["promedio_d2"] == 0.0
    assert data["carreras_riesgo_alto"] == 0
    assert data["carreras_oportunidad_alta"] == 0


def test_kpis_resumen_nacional_con_datos(client, db_session):
    _seed_carrera(db_session, "rn1")
    _seed_carrera(db_session, "rn2")
    resp = client.get("/publico/kpis/resumen")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_carreras"] >= 2
    assert 0.0 <= data["promedio_d1"] <= 1.0
    assert 0.0 <= data["promedio_d2"] <= 1.0
    assert 0.0 <= data["promedio_d3"] <= 1.0
    assert 0.0 <= data["promedio_d6"] <= 1.0
    assert data["carreras_riesgo_alto"] >= 0
    assert data["carreras_oportunidad_alta"] >= 0


def test_kpis_resumen_cache_hit(client, db_session):
    _seed_carrera(db_session, "cache1")
    resp1 = client.get("/publico/kpis/resumen")
    resp2 = client.get("/publico/kpis/resumen")
    assert resp1.status_code == 200
    assert resp2.status_code == 200
    assert resp1.json() == resp2.json()


# --- GET /publico/kpis/tendencias ---

def test_kpis_tendencias_sin_datos(client):
    resp = client.get("/publico/kpis/tendencias")
    assert resp.status_code == 200
    assert resp.json() == []


def test_kpis_tendencias_con_datos(client, db_session):
    from pipeline.db.models import KpiHistorico
    from datetime import date
    hoy = date.today()
    for kpi in ['d1_score', 'd2_score', 'd3_score', 'd6_score']:
        db_session.add(KpiHistorico(
            entidad_tipo='carrera', entidad_id='c1', fecha=hoy,
            kpi_nombre=kpi, valor=0.45,
        ))
    db_session.flush()
    resp = client.get("/publico/kpis/tendencias?dias=30")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["fecha"] == str(hoy)
    assert data[0]["d1_score"] == 0.45


# --- GET /publico/vacantes ---

def test_vacantes_publico_vacio(client):
    resp = client.get("/publico/vacantes")
    assert resp.status_code == 200
    assert resp.json() == []


def test_vacantes_publico_con_datos(client, db_session):
    from pipeline.db.models import Vacante
    import json
    db_session.add(Vacante(titulo="Dev Python", empresa="ACME", sector="Tecnología", skills=json.dumps(["Python"])))
    db_session.add(Vacante(titulo="Analista SQL", empresa="XYZ", sector="Finanzas", skills=json.dumps(["SQL"])))
    db_session.flush()
    resp = client.get("/publico/vacantes")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2
    titulos = [v["titulo"] for v in data]
    assert "Dev Python" in titulos


def test_vacantes_publico_filtro_sector(client, db_session):
    from pipeline.db.models import Vacante
    import json
    db_session.add(Vacante(titulo="ML Eng", sector="Tecnología", skills=json.dumps(["Python"])))
    db_session.add(Vacante(titulo="Analista", sector="Finanzas", skills=json.dumps(["Excel"])))
    db_session.flush()
    resp = client.get("/publico/vacantes?sector=Tecnología")
    assert resp.status_code == 200
    data = resp.json()
    assert all(v["sector"] == "Tecnología" for v in data)
    assert any(v["titulo"] == "ML Eng" for v in data)


# --- GET /publico/sectores ---

def test_sectores_vacio(client):
    resp = client.get("/publico/sectores")
    assert resp.status_code == 200
    assert resp.json() == []


def test_sectores_con_datos(client, db_session):
    from pipeline.db.models import Vacante
    db_session.add(Vacante(titulo="A", sector="Tecnología"))
    db_session.add(Vacante(titulo="B", sector="Finanzas"))
    db_session.add(Vacante(titulo="C", sector="Tecnología"))
    db_session.flush()
    resp = client.get("/publico/sectores")
    assert resp.status_code == 200
    data = resp.json()
    assert "Tecnología" in data
    assert "Finanzas" in data
    assert data == sorted(data)


# --- GET /publico/vacantes/skills ---

def test_vacantes_skills_vacio(client):
    resp = client.get("/publico/vacantes/skills")
    assert resp.status_code == 200
    assert resp.json() == []


def test_vacantes_skills_con_datos(client, db_session):
    from pipeline.db.models import Vacante
    import json
    db_session.add(Vacante(titulo="Dev A", skills=json.dumps(["Python", "SQL"])))
    db_session.add(Vacante(titulo="Dev B", skills=json.dumps(["Python", "Docker"])))
    db_session.add(Vacante(titulo="Dev C", skills=json.dumps(["SQL", "Go"])))
    db_session.flush()
    resp = client.get("/publico/vacantes/skills?top=5")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1
    nombres = [d["nombre"] for d in data]
    assert "Python" in nombres
    counts = {d["nombre"]: d["count"] for d in data}
    assert counts["Python"] == 2
    assert counts["SQL"] == 2


def test_kpis_resumen_cache_clear(client, db_session):
    from api.routers.publico import _clear_kpis_cache
    _seed_carrera(db_session, "cache2")
    resp1 = client.get("/publico/kpis/resumen")
    assert resp1.json()["total_carreras"] >= 1
    _clear_kpis_cache()
    resp2 = client.get("/publico/kpis/resumen")
    assert resp2.status_code == 200

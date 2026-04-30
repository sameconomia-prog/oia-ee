# tests/api/test_publico.py
import json
from pipeline.db.models import IES, Noticia, Alerta, Carrera, CarreraIES, Ocupacion


def test_resumen_vacio(client):
    resp = client.get("/publico/resumen")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_ies"] >= 0
    assert data["total_noticias"] >= 0
    assert data["total_vacantes"] >= 0
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


def test_carreras_publico_filtro_nombre(client, db_session):
    _seed_carrera(db_session, "filtq1")
    resp = client.get("/publico/carreras?q=filtq1")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    nombres = [c["nombre"].lower() for c in data]
    assert any("filtq1" in n for n in nombres)


def test_carreras_publico_filtro_nombre_vacio(client, db_session):
    _seed_carrera(db_session, "filtq2")
    resp = client.get("/publico/carreras?q=xyzzzznoencontrada")
    assert resp.status_code == 200
    assert resp.json() == []


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


# --- GET /publico/estadisticas ---

def test_estadisticas_publicas(client):
    resp = client.get("/publico/estadisticas")
    assert resp.status_code == 200
    data = resp.json()
    assert "total_ies" in data
    assert "total_carreras" in data
    assert "total_vacantes" in data
    assert "total_noticias" in data
    assert "alertas_activas" in data
    assert isinstance(data["top_skills"], list)


def test_estadisticas_con_vacantes(client, db_session):
    from pipeline.db.models import Vacante
    import json as _json
    db_session.add(Vacante(titulo="DS", sector="Tech", skills=_json.dumps(["Python", "SQL"])))
    db_session.add(Vacante(titulo="MLE", sector="Tech", skills=_json.dumps(["Python", "TF"])))
    db_session.flush()
    resp = client.get("/publico/estadisticas")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_vacantes"] >= 2
    assert "Python" in data["top_skills"]


def test_carreras_filtro_q(client, db_session):
    _seed_carrera(db_session, "filtroq99")
    resp = client.get("/publico/carreras?q=filtroq99")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1
    assert any("filtroq99" in c["nombre"].lower() for c in data)


# --- GET /publico/ies/{ies_id}/carreras ---

def test_carreras_ies_no_encontrada(client):
    resp = client.get("/publico/ies/ies-inexistente/carreras")
    assert resp.status_code == 404


def test_carreras_ies_publico(client, db_session):
    _seed_carrera(db_session, "iescarr1")
    ies = db_session.query(__import__('pipeline.db.models', fromlist=['IES']).IES).filter_by(nombre="IES Pub iescarr1").first()
    resp = client.get(f"/publico/ies/{ies.id}/carreras")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
    assert len(resp.json()) >= 1


# --- GET /publico/kpis/top-riesgo ---

def test_top_riesgo_vacio(client):
    resp = client.get("/publico/kpis/top-riesgo")
    assert resp.status_code == 200
    assert resp.json() == []


def test_top_riesgo_con_datos(client, db_session):
    _seed_carrera(db_session, "tr1")
    _seed_carrera(db_session, "tr2")
    resp = client.get("/publico/kpis/top-riesgo?n=3")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) <= 3
    scores = [d["d1_score"] for d in data]
    assert scores == sorted(scores, reverse=True)  # ordenado descendente


# --- GET /publico/kpis/top-oportunidades ---

def test_top_oportunidades_vacio(client):
    resp = client.get("/publico/kpis/top-oportunidades")
    assert resp.status_code == 200
    assert resp.json() == []


def test_top_oportunidades_con_datos(client, db_session):
    _seed_carrera(db_session, "to1")
    _seed_carrera(db_session, "to2")
    resp = client.get("/publico/kpis/top-oportunidades?n=3")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) <= 3
    scores = [d["d2_score"] for d in data]
    assert scores == sorted(scores, reverse=True)  # ordenado descendente por D2


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


# --- GET /publico/vacantes/{id} ---

def test_detalle_vacante_no_encontrada(client):
    resp = client.get("/publico/vacantes/vac-inexistente")
    assert resp.status_code == 404


def test_detalle_vacante_con_datos(client, db_session):
    from pipeline.db.models import Vacante
    import json as _json
    v = Vacante(titulo="SWE Python", empresa="TechCo", sector="Tecnología",
                skills=_json.dumps(["Python", "FastAPI"]), nivel_educativo="Ingeniería",
                experiencia_anios=3)
    db_session.add(v)
    db_session.flush()
    resp = client.get(f"/publico/vacantes/{v.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["titulo"] == "SWE Python"
    assert "Python" in data["skills"]
    assert data["nivel_educativo"] == "Ingeniería"
    assert data["experiencia_anios"] == 3


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


def test_vacantes_publico_filtro_q(client, db_session):
    from pipeline.db.models import Vacante
    import json
    db_session.add(Vacante(titulo="Data Scientist IA", empresa="TechCorp", skills=json.dumps([])))
    db_session.add(Vacante(titulo="Contador Público", empresa="Finanzas SA", skills=json.dumps([])))
    db_session.flush()
    resp = client.get("/publico/vacantes?q=data")
    assert resp.status_code == 200
    data = resp.json()
    assert any(v["titulo"] == "Data Scientist IA" for v in data)
    assert not any(v["titulo"] == "Contador Público" for v in data)


def test_vacantes_publico_filtro_q_empresa(client, db_session):
    from pipeline.db.models import Vacante
    import json
    db_session.add(Vacante(titulo="Desarrollador", empresa="TechCorp IA", skills=json.dumps([])))
    db_session.add(Vacante(titulo="Analista", empresa="Banca Global", skills=json.dumps([])))
    db_session.flush()
    resp = client.get("/publico/vacantes?q=techcorp")
    assert resp.status_code == 200
    data = resp.json()
    assert any(v["empresa"] == "TechCorp IA" for v in data)
    assert not any(v["empresa"] == "Banca Global" for v in data)


def test_vacantes_publico_paginacion_skip(client, db_session):
    from pipeline.db.models import Vacante
    import json
    for i in range(5):
        db_session.add(Vacante(titulo=f"Vacante {i}", skills=json.dumps([])))
    db_session.flush()
    resp_all = client.get("/publico/vacantes?limit=5")
    assert resp_all.status_code == 200
    all_titles = [v["titulo"] for v in resp_all.json()]
    resp_skip = client.get("/publico/vacantes?skip=2&limit=3")
    assert resp_skip.status_code == 200
    skipped = resp_skip.json()
    assert len(skipped) == 3
    assert all(v["titulo"] in all_titles for v in skipped)
    assert skipped[0]["titulo"] == all_titles[2]


def test_vacantes_publico_paginacion_limit_cero(client):
    resp = client.get("/publico/vacantes?limit=0")
    assert resp.status_code == 200
    assert resp.json() == []


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


# --- GET /publico/ies/{ies_id} ---

def test_detalle_ies_no_encontrada(client):
    resp = client.get("/publico/ies/ies-inexistente")
    assert resp.status_code == 404


def test_detalle_ies_con_datos(client, db_session):
    _seed_carrera(db_session, "iesdet1")
    ies = db_session.query(__import__('pipeline.db.models', fromlist=['IES']).IES).filter_by(nombre="IES Pub iesdet1").first()
    resp = client.get(f"/publico/ies/{ies.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == ies.id
    assert data["total_carreras"] >= 1
    assert 0.0 <= data["promedio_d1"] <= 1.0
    assert 0.0 <= data["promedio_d2"] <= 1.0
    assert data["carreras_riesgo_alto"] >= 0


# --- GET /publico/carreras/{carrera_id} ---

def test_detalle_carrera_no_encontrada(client):
    resp = client.get("/publico/carreras/carrera-inexistente")
    assert resp.status_code == 404


def test_detalle_carrera_con_datos(client, db_session):
    carrera = _seed_carrera(db_session, "det1")
    resp = client.get(f"/publico/carreras/{carrera.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == carrera.id
    assert "kpi" in data
    assert isinstance(data["instituciones"], list)
    assert len(data["instituciones"]) >= 1
    assert "ies_nombre" in data["instituciones"][0]


def test_ies_busqueda_q(client, db_session):
    db_session.add(IES(nombre="Universidad Nacional", nombre_corto="UNAM", tipo="pública"))
    db_session.add(IES(nombre="Instituto Tecnológico", nombre_corto="IPN", tipo="pública"))
    db_session.flush()
    resp = client.get("/publico/ies?q=nacion")
    assert resp.status_code == 200
    data = resp.json()
    assert any(i["nombre"] == "Universidad Nacional" for i in data)
    assert not any(i["nombre"] == "Instituto Tecnológico" for i in data)


def test_ies_busqueda_q_nombre_corto(client, db_session):
    db_session.add(IES(nombre="Instituto Tecnológico", nombre_corto="ITECH", tipo="pública"))
    db_session.add(IES(nombre="Universidad del Sur", nombre_corto="US", tipo="privada"))
    db_session.flush()
    resp = client.get("/publico/ies?q=itech")
    assert resp.status_code == 200
    data = resp.json()
    assert any(i["nombre_corto"] == "ITECH" for i in data)
    assert not any(i["nombre_corto"] == "US" for i in data)


def test_kpis_resumen_cache_clear(client, db_session):
    from api.routers.publico import _clear_kpis_cache
    _seed_carrera(db_session, "cache2")
    resp1 = client.get("/publico/kpis/resumen")
    assert resp1.json()["total_carreras"] >= 1
    _clear_kpis_cache()
    resp2 = client.get("/publico/kpis/resumen")
    assert resp2.status_code == 200


def test_ies_lista_incluye_total_carreras(client, db_session):
    ies = IES(nombre="IES Con Carreras", nombre_corto="ICC", activa=True)
    db_session.add(ies)
    db_session.flush()
    carrera = Carrera(nombre_norm="ingenieria_sistemas_test102")
    db_session.add(carrera)
    db_session.flush()
    db_session.add(CarreraIES(carrera_id=carrera.id, ies_id=ies.id, ciclo="2024A"))
    db_session.flush()
    resp = client.get("/publico/ies")
    assert resp.status_code == 200
    data = resp.json()
    ies_data = next((i for i in data if i["nombre"] == "IES Con Carreras"), None)
    assert ies_data is not None
    assert ies_data["total_carreras"] == 1


def test_ies_lista_total_carreras_cero_sin_carreras(client, db_session):
    db_session.add(IES(nombre="IES Sin Carreras", nombre_corto="ISC", activa=True))
    db_session.flush()
    resp = client.get("/publico/ies")
    assert resp.status_code == 200
    data = resp.json()
    ies_data = next((i for i in data if i["nombre"] == "IES Sin Carreras"), None)
    assert ies_data is not None
    assert ies_data["total_carreras"] == 0


# --- GET /publico/kpis/distribucion ---

def test_kpis_distribucion_vacio(client):
    resp = client.get("/publico/kpis/distribucion")
    assert resp.status_code == 200
    data = resp.json()
    assert "d1" in data and "d2" in data
    assert isinstance(data["d1"], list)
    total_d1 = sum(b["count"] for b in data["d1"])
    total_d2 = sum(b["count"] for b in data["d2"])
    assert total_d1 == 0
    assert total_d2 == 0


def test_kpis_distribucion_con_datos(client, db_session):
    _seed_carrera(db_session, "dbx1")
    _seed_carrera(db_session, "dby2")
    resp = client.get("/publico/kpis/distribucion")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["d1"]) == 3
    assert len(data["d2"]) == 3
    total = sum(b["count"] for b in data["d1"])
    assert total >= 2
    rangos = [b["rango"] for b in data["d1"]]
    assert any("Bajo" in r for r in rangos)
    assert any("Medio" in r for r in rangos)
    assert any("Alto" in r for r in rangos)


# --- GET /publico/vacantes/tendencia ---

def test_vacantes_tendencia_vacio(client):
    resp = client.get("/publico/vacantes/tendencia")
    assert resp.status_code == 200
    assert resp.json() == []


def test_vacantes_tendencia_con_datos(client, db_session):
    from pipeline.db.models import Vacante
    from datetime import date
    db_session.add(Vacante(titulo="ML Eng", sector="Tech", fecha_pub=date(2024, 1, 15)))
    db_session.add(Vacante(titulo="DS", sector="Tech", fecha_pub=date(2024, 1, 20)))
    db_session.add(Vacante(titulo="AI Res", sector="Tech", fecha_pub=date(2024, 2, 10)))
    db_session.flush()
    resp = client.get("/publico/vacantes/tendencia")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 2
    meses = [d["mes"] for d in data]
    assert "2024-01" in meses
    assert "2024-02" in meses
    jan = next(d for d in data if d["mes"] == "2024-01")
    assert jan["count"] == 2


# --- Tests ranking endpoint ---

def test_ranking_retorna_200_vacio(client, db_session):
    resp = client.get("/publico/kpis/ranking")
    assert resp.status_code == 200
    assert resp.json() == []


def test_ranking_d1_con_datos(client, db_session):
    from pipeline.db.models import Carrera, CarreraIES, IES
    ies = IES(nombre="IES Ranking", nombre_corto="IES")
    db_session.add(ies)
    db_session.flush()
    c1 = Carrera(nombre_norm="ingeniería industrial", area_conocimiento="Ingeniería")
    c2 = Carrera(nombre_norm="medicina", area_conocimiento="Salud")
    db_session.add_all([c1, c2])
    db_session.flush()
    db_session.add(CarreraIES(carrera_id=c1.id, ies_id=ies.id, ciclo="2024A"))
    db_session.add(CarreraIES(carrera_id=c2.id, ies_id=ies.id, ciclo="2024A"))
    db_session.flush()
    resp = client.get("/publico/kpis/ranking?n=10&orden=d1")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    for item in data:
        assert "carrera_id" in item
        assert "d1_score" in item
        assert "d2_score" in item
        assert "area_conocimiento" in item


def test_ranking_max_100(client, db_session):
    resp = client.get("/publico/kpis/ranking?n=200")
    assert resp.status_code == 200


def test_ranking_d2_orden(client, db_session):
    resp = client.get("/publico/kpis/ranking?orden=d2")
    assert resp.status_code == 200


# --- Tests /impacto ---

def test_impacto_vacio(client):
    resp = client.get("/publico/impacto")
    assert resp.status_code == 200
    data = resp.json()
    assert "resumen" in data
    assert "total_noticias_despido" in data["resumen"]
    assert "total_empleados_afectados" in data["resumen"]
    assert "total_noticias_positivas" in data["resumen"]
    assert "total_vacantes_ia" in data["resumen"]
    assert isinstance(data["despidos_por_sector"], list)
    assert isinstance(data["top_skills_demandados"], list)
    assert isinstance(data["ocupaciones_mayor_riesgo"], list)
    assert isinstance(data["ocupaciones_mayor_oportunidad"], list)


def test_impacto_con_datos(client, db_session):
    db_session.add(Noticia(
        titulo="Meta despide 10k empleados por IA",
        url="https://example.com/meta",
        tipo_impacto="despido_masivo",
        sector="tecnología",
        pais="EE.UU.",
        n_empleados=10000,
        causa_ia="LLMs",
    ))
    db_session.add(Noticia(
        titulo="Google crea 5k empleos IA",
        url="https://example.com/google",
        tipo_impacto="adopcion_ia",
        sector="tecnología",
        pais="EE.UU.",
    ))
    db_session.add(Ocupacion(onet_code="43-3031.00", nombre="Contador", p_automatizacion=0.94, p_augmentacion=0.10))
    db_session.flush()
    resp = client.get("/publico/impacto")
    assert resp.status_code == 200
    data = resp.json()
    assert data["resumen"]["total_noticias_despido"] >= 1
    assert data["resumen"]["total_empleados_afectados"] >= 10000
    assert data["resumen"]["total_noticias_positivas"] >= 1
    assert any(s["sector"] == "tecnología" for s in data["despidos_por_sector"])
    assert len(data["ocupaciones_mayor_riesgo"]) >= 1

from pipeline.db.models import IES, Noticia, Vacante


def test_get_kpis_estado_sin_datos(client):
    resp = client.get("/kpis/estado/Tlaxcala")
    assert resp.status_code == 200
    data = resp.json()
    assert data["estado"] == "Tlaxcala"
    assert set(data["d5_geografia"].keys()) == {"idr", "icg", "ies_s", "score"}
    assert 0.0 <= data["d5_geografia"]["score"] <= 1.0


def test_get_kpis_estado_con_vacantes(client, db_session):
    ies = IES(nombre="IES Estado Test", estado="Michoacán", activa=True, matricula_total=5000)
    db_session.add(ies)
    for i in range(5):
        v = Vacante(titulo=f"Analista {i}", estado="Michoacán")
        db_session.add(v)
    db_session.flush()
    resp = client.get("/kpis/estado/Michoacán")
    assert resp.status_code == 200
    data = resp.json()
    assert data["d5_geografia"]["ies_s"] > 0.5


def test_get_kpis_estado_estructura_completa(client):
    resp = client.get("/kpis/estado/Guerrero")
    assert resp.status_code == 200
    d5 = resp.json()["d5_geografia"]
    for key in ("idr", "icg", "ies_s", "score"):
        assert key in d5
        assert isinstance(d5[key], float)


def test_get_kpis_estado_score_rango(client, db_session):
    ies = IES(nombre="IES Score Test", estado="Hidalgo", activa=True, matricula_total=2000)
    db_session.add(ies)
    for i in range(5):
        n = Noticia(titulo=f"Lay {i}", url=f"http://lay.com/{i}",
                    fuente="t", causa_ia="automatización")
        db_session.add(n)
    db_session.flush()
    resp = client.get("/kpis/estado/Hidalgo")
    assert resp.status_code == 200
    score = resp.json()["d5_geografia"]["score"]
    assert 0.0 <= score <= 1.0

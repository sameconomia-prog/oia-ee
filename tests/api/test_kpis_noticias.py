def test_get_kpis_noticias_estructura(client):
    resp = client.get("/kpis/noticias")
    assert resp.status_code == 200
    data = resp.json()
    assert "d7_noticias" in data
    assert set(data["d7_noticias"].keys()) == {"isn", "vdm", "score"}


def test_get_kpis_noticias_rango(client):
    resp = client.get("/kpis/noticias")
    assert resp.status_code == 200
    d7 = resp.json()["d7_noticias"]
    assert 0.0 <= d7["isn"] <= 1.0
    assert 0.0 <= d7["vdm"] <= 1.0
    assert 0.0 <= d7["score"] <= 1.0


def test_get_kpis_noticias_types(client):
    resp = client.get("/kpis/noticias")
    assert resp.status_code == 200
    d7 = resp.json()["d7_noticias"]
    for key in ("isn", "vdm", "score"):
        assert isinstance(d7[key], float)

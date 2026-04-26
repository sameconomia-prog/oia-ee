# tests/api/test_radar_router.py
def test_radar_despidos_empty_returns_ok(client):
    response = client.get("/radar/despidos")
    assert response.status_code == 200
    data = response.json()
    assert "total" in data
    assert "items" in data
    assert isinstance(data["items"], list)


def test_radar_estadisticas_returns_ok(client):
    response = client.get("/radar/despidos/estadisticas")
    assert response.status_code == 200
    data = response.json()
    assert "total_despidos_acumulados" in data
    assert "ahorro_salarial_anual_usd" in data


def test_radar_empleos_empty_returns_ok(client):
    response = client.get("/radar/empleos")
    assert response.status_code == 200


def test_radar_skills_empty_returns_ok(client):
    response = client.get("/radar/skills")
    assert response.status_code == 200

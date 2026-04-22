# tests/api/test_alertas.py
import json
from pipeline.db.models import IES, Carrera, CarreraIES, Alerta


def test_get_alertas_vacio(authed_client):
    client, ies_id = authed_client
    resp = client.get(f"/alertas?ies_id={ies_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["alertas"] == []
    assert data["total"] == 0


def test_get_alertas_retorna_datos(authed_client, db_session):
    client, ies_id = authed_client

    carrera = Carrera(nombre_norm="Carrera Con Alerta", onet_codes_relacionados=json.dumps([]))
    db_session.add(carrera)
    db_session.flush()

    alerta = Alerta(
        ies_id=ies_id,
        carrera_id=carrera.id,
        tipo="d1_alto",
        severidad="alta",
        titulo="D1 crítico",
        mensaje="D1 = 0.85 (umbral: 0.70) · D2 = 0.50 (umbral: 0.40)",
    )
    db_session.add(alerta)
    db_session.flush()

    resp = client.get(f"/alertas?ies_id={ies_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert len(data["alertas"]) == 1
    a = data["alertas"][0]
    assert a["carrera_nombre"] == "Carrera Con Alerta"
    assert a["tipo"] == "d1_alto"
    assert a["severidad"] == "alta"
    assert a["leida"] is False


def test_marcar_alerta_leida(authed_client, db_session):
    client, ies_id = authed_client

    carrera = Carrera(nombre_norm="Carrera Leer", onet_codes_relacionados=json.dumps([]))
    db_session.add(carrera)
    db_session.flush()

    alerta = Alerta(
        ies_id=ies_id,
        carrera_id=carrera.id,
        tipo="d2_bajo",
        severidad="media",
        titulo="D2 bajo",
    )
    db_session.add(alerta)
    db_session.flush()

    resp = client.put(f"/alertas/{alerta.id}/leer")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == alerta.id
    assert data["leida"] is True


def test_marcar_alerta_inexistente(authed_client):
    client, ies_id = authed_client
    resp = client.put("/alertas/id-no-existe/leer")
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Alerta no encontrada"


def test_marcar_leida_ies_distinta_da_403(authed_client, db_session):
    client, ies_id = authed_client
    # Crear otra IES y una alerta para esa IES
    from pipeline.db.models import IES, Alerta
    otra_ies = IES(nombre="IES Otra", nombre_corto="IO")
    db_session.add(otra_ies)
    db_session.flush()
    alerta = Alerta(
        ies_id=otra_ies.id,
        carrera_id="carrera-x",
        tipo="d1_alto",
        severidad="alta",
        titulo="Test",
        mensaje="Test",
    )
    db_session.add(alerta)
    db_session.flush()
    resp = client.put(f"/alertas/{alerta.id}/leer")
    assert resp.status_code == 403

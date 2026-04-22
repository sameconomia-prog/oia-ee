# tests/api/test_alertas.py
import json
from pipeline.db.models import IES, Carrera, CarreraIES, Alerta


def test_get_alertas_vacio(client, db_session):
    ies = IES(nombre="IES Sin Alertas", nombre_corto="ISA")
    db_session.add(ies)
    db_session.flush()

    resp = client.get(f"/alertas?ies_id={ies.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["alertas"] == []
    assert data["total"] == 0


def test_get_alertas_retorna_datos(client, db_session):
    ies = IES(nombre="IES Con Alertas", nombre_corto="ICA")
    db_session.add(ies)
    carrera = Carrera(nombre_norm="Carrera Con Alerta", onet_codes_relacionados=json.dumps([]))
    db_session.add(carrera)
    db_session.flush()

    alerta = Alerta(
        ies_id=ies.id,
        carrera_id=carrera.id,
        tipo="d1_alto",
        severidad="alta",
        titulo="D1 crítico",
        mensaje="D1 = 0.85 (umbral: 0.70) · D2 = 0.50 (umbral: 0.40)",
    )
    db_session.add(alerta)
    db_session.flush()

    resp = client.get(f"/alertas?ies_id={ies.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert len(data["alertas"]) == 1
    a = data["alertas"][0]
    assert a["carrera_nombre"] == "Carrera Con Alerta"
    assert a["tipo"] == "d1_alto"
    assert a["severidad"] == "alta"
    assert a["leida"] is False


def test_marcar_alerta_leida(client, db_session):
    ies = IES(nombre="IES Leer", nombre_corto="IL")
    db_session.add(ies)
    carrera = Carrera(nombre_norm="Carrera Leer", onet_codes_relacionados=json.dumps([]))
    db_session.add(carrera)
    db_session.flush()

    alerta = Alerta(
        ies_id=ies.id,
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


def test_marcar_alerta_inexistente(client):
    resp = client.put("/alertas/id-no-existe/leer")
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Alerta no encontrada"

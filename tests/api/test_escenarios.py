# tests/api/test_escenarios.py
import json
from pipeline.db.models import IES, Escenario

_VALID_INPUT = {
    "carrera_id": "carrera-uuid-001",
    "carrera_nombre": "Derecho",
    "iva": 0.75, "bes": 0.80, "vac": 0.60,
    "ioe": 0.40, "ihe": 0.35, "iea": 0.45,
}


def test_simular_retorna_resultado(authed_client):
    client, ies_id = authed_client
    resp = client.post("/escenarios/simular", json={**_VALID_INPUT, "ies_id": ies_id})
    assert resp.status_code == 200
    data = resp.json()
    assert data["carrera_nombre"] == "Derecho"
    # D1 = 0.75*0.5 + 0.80*0.3 + 0.60*0.2 = 0.735
    assert data["d1_score"] == 0.735
    # D2 = 0.40*0.4 + 0.35*0.35 + 0.45*0.25 = 0.395
    assert data["d2_score"] == 0.395
    assert "id" in data
    assert "fecha" in data


def test_simular_persiste_escenario(authed_client, db_session):
    client, ies_id = authed_client
    resp = client.post("/escenarios/simular", json={**_VALID_INPUT, "ies_id": ies_id})
    assert resp.status_code == 200
    escenario_id = resp.json()["id"]

    db_session.expire_all()
    escenario = db_session.query(Escenario).filter_by(id=escenario_id).first()
    assert escenario is not None
    assert escenario.tipo == "custom"
    assert escenario.horizonte_anios is None
    acciones = json.loads(escenario.acciones)
    assert acciones["iva"] == 0.75
    assert acciones["carrera_nombre"] == "Derecho"
    proyecciones = json.loads(escenario.proyecciones)
    assert proyecciones["d1_score"] == 0.735


def test_simular_input_invalido(authed_client):
    client, ies_id = authed_client
    # iva = 1.5 está fuera del rango [0, 1]
    resp = client.post("/escenarios/simular", json={**_VALID_INPUT, "ies_id": ies_id, "iva": 1.5})
    assert resp.status_code == 422


def test_get_escenarios_lista_ordenada(authed_client):
    client, ies_id = authed_client
    payload_base = {**_VALID_INPUT, "ies_id": ies_id}
    for nombre in ["Derecho", "Medicina", "Contaduría"]:
        client.post("/escenarios/simular", json={**payload_base, "carrera_nombre": nombre})

    resp = client.get("/escenarios/")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 3
    assert len(data["escenarios"]) == 3
    nombres = [e["carrera_nombre"] for e in data["escenarios"]]
    assert nombres[0] == "Contaduría"


def test_get_escenarios_paginacion(authed_client):
    client, ies_id = authed_client
    payload = {**_VALID_INPUT, "ies_id": ies_id}
    for nombre in ["A", "B", "C", "D", "E"]:
        client.post("/escenarios/simular", json={**payload, "carrera_nombre": nombre})

    resp = client.get("/escenarios/?skip=2&limit=2")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 5
    assert len(data["escenarios"]) == 2


def test_get_escenarios_ies_distinta(authed_client, db_session):
    client, ies_id = authed_client

    # Crear escenario de la IES autenticada via API
    client.post("/escenarios/simular", json={**_VALID_INPUT, "ies_id": ies_id})

    # Crear escenario de otra IES directamente en BD (no se puede via API por validación 403)
    otra_ies = IES(nombre="IES Otra", nombre_corto="IO")
    db_session.add(otra_ies)
    db_session.flush()
    escenario_otro = Escenario(
        ies_id=otra_ies.id,
        tipo="custom",
        horizonte_anios=None,
        acciones=json.dumps({**_VALID_INPUT}),
        proyecciones=json.dumps({"d1_score": 0.5, "d2_score": 0.5}),
    )
    db_session.add(escenario_otro)
    db_session.flush()

    resp = client.get("/escenarios/")
    assert resp.json()["total"] == 1

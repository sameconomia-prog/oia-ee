# tests/api/test_escenarios.py
import json
from pipeline.db.models import IES, Escenario

_VALID_INPUT = {
    "carrera_id": "carrera-uuid-001",
    "carrera_nombre": "Derecho",
    "iva": 0.75, "bes": 0.80, "vac": 0.60,
    "ioe": 0.40, "ihe": 0.35, "iea": 0.45,
}


def test_simular_retorna_resultado(client, db_session):
    ies = IES(nombre="IES Simulador", nombre_corto="IS")
    db_session.add(ies)
    db_session.flush()

    resp = client.post("/escenarios/simular", json={**_VALID_INPUT, "ies_id": ies.id})
    assert resp.status_code == 200
    data = resp.json()
    assert data["carrera_nombre"] == "Derecho"
    # D1 = 0.75*0.5 + 0.80*0.3 + 0.60*0.2 = 0.735
    assert data["d1_score"] == 0.735
    # D2 = 0.40*0.4 + 0.35*0.35 + 0.45*0.25 = 0.395
    assert data["d2_score"] == 0.395
    assert "id" in data
    assert "fecha" in data


def test_simular_persiste_escenario(client, db_session):
    ies = IES(nombre="IES Persistir", nombre_corto="IP")
    db_session.add(ies)
    db_session.flush()

    resp = client.post("/escenarios/simular", json={**_VALID_INPUT, "ies_id": ies.id})
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


def test_simular_input_invalido(client, db_session):
    ies = IES(nombre="IES Invalido", nombre_corto="II")
    db_session.add(ies)
    db_session.flush()

    # iva = 1.5 está fuera del rango [0, 1]
    resp = client.post("/escenarios/simular", json={**_VALID_INPUT, "ies_id": ies.id, "iva": 1.5})
    assert resp.status_code == 422


def test_get_escenarios_lista_ordenada(client, db_session):
    ies = IES(nombre="IES Historial", nombre_corto="IH")
    db_session.add(ies)
    db_session.flush()

    payload_base = {**_VALID_INPUT, "ies_id": ies.id}
    for nombre in ["Derecho", "Medicina", "Contaduría"]:
        client.post("/escenarios/simular", json={**payload_base, "carrera_nombre": nombre})

    resp = client.get(f"/escenarios/?ies_id={ies.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 3
    assert len(data["escenarios"]) == 3
    nombres = [e["carrera_nombre"] for e in data["escenarios"]]
    assert nombres[0] == "Contaduría"


def test_get_escenarios_paginacion(client, db_session):
    ies = IES(nombre="IES Paginacion", nombre_corto="IP2")
    db_session.add(ies)
    db_session.flush()

    payload = {**_VALID_INPUT, "ies_id": ies.id}
    for nombre in ["A", "B", "C", "D", "E"]:
        client.post("/escenarios/simular", json={**payload, "carrera_nombre": nombre})

    resp = client.get(f"/escenarios/?ies_id={ies.id}&skip=2&limit=2")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 5
    assert len(data["escenarios"]) == 2


def test_get_escenarios_ies_distinta(client, db_session):
    ies1 = IES(nombre="IES Uno", nombre_corto="I1")
    ies2 = IES(nombre="IES Dos", nombre_corto="I2")
    db_session.add_all([ies1, ies2])
    db_session.flush()

    client.post("/escenarios/simular", json={**_VALID_INPUT, "ies_id": ies1.id})
    client.post("/escenarios/simular", json={**_VALID_INPUT, "ies_id": ies2.id})

    resp = client.get(f"/escenarios/?ies_id={ies1.id}")
    assert resp.json()["total"] == 1

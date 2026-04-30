import os
import pytest
from pipeline.db.models import Contacto


def _payload_ies(**kwargs):
    base = {
        "tipo": "ies",
        "nombre": "Arturo Rector",
        "cargo": "Rector",
        "institucion": "Universidad Test",
        "email": "rector@test.edu.mx",
        "mensaje": "Quiero el análisis",
    }
    base.update(kwargs)
    return base


def _payload_gobierno(**kwargs):
    base = {
        "tipo": "gobierno",
        "nombre": "Ana Investigadora",
        "institucion": "SEP",
        "email": "ana@sep.gob.mx",
        "area_interes": "politica_publica",
    }
    base.update(kwargs)
    return base


def test_crear_contacto_ies(client, db_session):
    resp = client.post("/publico/contacto", json=_payload_ies())
    assert resp.status_code == 201
    data = resp.json()
    assert "id" in data
    assert data["estado"] == "nuevo"
    contacto = db_session.query(Contacto).filter_by(id=data["id"]).first()
    assert contacto is not None
    assert contacto.tipo == "ies"
    assert contacto.email == "rector@test.edu.mx"


def test_crear_contacto_gobierno(client, db_session):
    resp = client.post("/publico/contacto", json=_payload_gobierno())
    assert resp.status_code == 201
    data = resp.json()
    assert "id" in data
    contacto = db_session.query(Contacto).filter_by(id=data["id"]).first()
    assert contacto.tipo == "gobierno"
    assert contacto.area_interes == "politica_publica"


def test_tipo_invalido_devuelve_422(client):
    payload = _payload_ies(tipo="desconocido")
    resp = client.post("/publico/contacto", json=payload)
    assert resp.status_code == 422


def test_email_invalido_devuelve_422(client):
    payload = _payload_ies(email="no-es-email")
    resp = client.post("/publico/contacto", json=payload)
    assert resp.status_code == 422


def test_campos_requeridos_devuelven_422(client):
    resp = client.post("/publico/contacto", json={"tipo": "ies"})
    assert resp.status_code == 422


def test_listar_contactos_sin_key_devuelve_401(client):
    resp = client.get("/publico/contacto")
    assert resp.status_code == 401


def test_listar_contactos_con_key(client, db_session, monkeypatch):
    monkeypatch.setenv("ADMIN_API_KEY", "testkey123")
    client.post("/publico/contacto", json=_payload_ies())
    resp = client.get("/publico/contacto?x_admin_key=testkey123")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
    assert len(resp.json()) >= 1


def test_listar_contactos_filtro_tipo(client, db_session, monkeypatch):
    monkeypatch.setenv("ADMIN_API_KEY", "testkey456")
    client.post("/publico/contacto", json=_payload_ies())
    client.post("/publico/contacto", json=_payload_gobierno())
    resp = client.get("/publico/contacto?tipo=ies&x_admin_key=testkey456")
    assert resp.status_code == 200
    assert all(c["tipo"] == "ies" for c in resp.json())

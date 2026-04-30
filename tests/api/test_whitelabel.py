# tests/api/test_whitelabel.py
import uuid
import pytest
from passlib.context import CryptContext
from pipeline.db.models import IES, Usuario

_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _superadmin_token(client, db_session):
    unique = uuid.uuid4().hex[:8]
    ies = IES(nombre="IES SA WL", nombre_corto="SA")
    db_session.add(ies)
    db_session.flush()
    user = Usuario(
        username=f"sa_wl_{unique}",
        hashed_password=_pwd.hash("pass"),
        ies_id=ies.id,
        rol="superadmin",
    )
    db_session.add(user)
    db_session.flush()
    resp = client.post("/auth/login", data={"username": user.username, "password": "pass"})
    assert resp.status_code == 200
    return resp.json()["access_token"], ies.id


def test_crear_config_sin_auth_devuelve_401(client):
    resp = client.post("/whitelabel/config", json={"ies_id": "x"})
    assert resp.status_code == 401


def test_crear_config_superadmin(client, db_session):
    token, ies_id = _superadmin_token(client, db_session)
    resp = client.post(
        "/whitelabel/config",
        json={"ies_id": ies_id, "nombre_app": "UPAEP Analytics", "color_primario": "#1D4ED8"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["nombre_app"] == "UPAEP Analytics"
    assert data["color_primario"] == "#1D4ED8"


def test_crear_config_color_invalido_devuelve_422(client, db_session):
    token, ies_id = _superadmin_token(client, db_session)
    resp = client.post(
        "/whitelabel/config",
        json={"ies_id": ies_id, "color_primario": "azul"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 422


def test_actualizar_config_existente(client, db_session):
    token, ies_id = _superadmin_token(client, db_session)
    headers = {"Authorization": f"Bearer {token}"}
    client.post("/whitelabel/config", json={"ies_id": ies_id, "nombre_app": "V1"}, headers=headers)
    resp = client.post("/whitelabel/config", json={"ies_id": ies_id, "nombre_app": "V2"}, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["nombre_app"] == "V2"


def test_obtener_config_por_ies_id(client, db_session):
    token, ies_id = _superadmin_token(client, db_session)
    client.post(
        "/whitelabel/config",
        json={"ies_id": ies_id, "nombre_app": "Portal CETYS"},
        headers={"Authorization": f"Bearer {token}"},
    )
    resp = client.get(f"/whitelabel/config?ies_id={ies_id}")
    assert resp.status_code == 200
    assert resp.json()["nombre_app"] == "Portal CETYS"


def test_obtener_config_ies_sin_config_devuelve_null(client):
    resp = client.get(f"/whitelabel/config?ies_id={uuid.uuid4()}")
    assert resp.status_code == 200
    assert resp.json() is None


def test_listar_configs_superadmin(client, db_session):
    token, ies_id = _superadmin_token(client, db_session)
    client.post("/whitelabel/config", json={"ies_id": ies_id}, headers={"Authorization": f"Bearer {token}"})
    resp = client.get("/whitelabel/configs", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_eliminar_config_superadmin(client, db_session):
    token, ies_id = _superadmin_token(client, db_session)
    client.post("/whitelabel/config", json={"ies_id": ies_id}, headers={"Authorization": f"Bearer {token}"})
    resp = client.delete(f"/whitelabel/config/{ies_id}", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    # Ya no existe
    resp2 = client.get(f"/whitelabel/config?ies_id={ies_id}")
    assert resp2.json() is None


def test_eliminar_config_inexistente_devuelve_404(client, db_session):
    token, _ = _superadmin_token(client, db_session)
    resp = client.delete("/whitelabel/config/no-existe", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 404

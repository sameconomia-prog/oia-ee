# tests/api/test_api_keys.py
import pytest
import uuid
from passlib.context import CryptContext
from pipeline.db.models import IES, Usuario

_pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


@pytest.fixture
def superadmin_client(client, db_session):
    """Client con JWT de superadmin."""
    ies = IES(nombre=f"IES Superadmin {uuid.uuid4().hex[:4]}", nombre_corto="ISA")
    db_session.add(ies)
    db_session.flush()
    username = f"superadmin_{uuid.uuid4().hex[:6]}"
    user = Usuario(
        username=username,
        hashed_password=_pwd_ctx.hash("super_pass"),
        ies_id=ies.id,
        rol="superadmin",
    )
    db_session.add(user)
    db_session.flush()
    resp = client.post("/auth/login", data={"username": username, "password": "super_pass"})
    assert resp.status_code == 200, f"Login falló: {resp.text}"
    token = resp.json()["access_token"]
    client.headers = {**client.headers, "Authorization": f"Bearer {token}"}
    return client


def test_crear_api_key_retorna_raw_key(superadmin_client):
    resp = superadmin_client.post(
        "/admin/api-keys",
        json={"name": "UNAM Test", "email": "test@unam.mx", "tier": "researcher"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["raw_key"].startswith("sk_oa_")
    assert len(data["raw_key"]) > 10
    assert data["key_prefix"] == data["raw_key"][:8]
    assert data["tier"] == "researcher"
    assert data["name"] == "UNAM Test"


def test_listar_api_keys_no_incluye_hash(superadmin_client):
    superadmin_client.post(
        "/admin/api-keys",
        json={"name": "Key A", "email": "a@test.mx", "tier": "researcher"},
    )
    resp = superadmin_client.get("/admin/api-keys")
    assert resp.status_code == 200
    items = resp.json()
    assert len(items) >= 1
    item = items[0]
    assert "raw_key" not in item
    assert "key_hash" not in item
    assert "key_prefix" in item
    assert "tier" in item
    assert "revoked" in item


def test_revocar_api_key(superadmin_client):
    create_resp = superadmin_client.post(
        "/admin/api-keys",
        json={"name": "Key Revocable", "email": "r@test.mx", "tier": "researcher"},
    )
    key_id = create_resp.json()["id"]
    resp = superadmin_client.delete(f"/admin/api-keys/{key_id}")
    assert resp.status_code == 200
    assert resp.json()["revoked"] is True


def test_sin_auth_devuelve_401(client):
    resp = client.post(
        "/admin/api-keys",
        json={"name": "X", "email": "x@x.mx", "tier": "researcher"},
    )
    assert resp.status_code == 401


def test_rol_no_superadmin_devuelve_403(authed_client):
    client, _ = authed_client
    resp = client.post(
        "/admin/api-keys",
        json={"name": "X", "email": "x@x.mx", "tier": "researcher"},
    )
    assert resp.status_code == 403

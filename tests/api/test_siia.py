# tests/api/test_siia.py
import uuid
import hashlib
import pytest
from passlib.context import CryptContext
from pipeline.db.models import IES, Usuario
from pipeline.db.models_siia import SiiaToken

_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

RAW_TOKEN = "siia_test_token_abc123xyz"
TOKEN_HASH = hashlib.sha256(RAW_TOKEN.encode()).hexdigest()


@pytest.fixture
def ies_id():
    return str(uuid.uuid4())


@pytest.fixture
def siia_ctx(db_session, ies_id):
    """Inserta un SiiaToken para el ies_id de este test y lo devuelve."""
    token = SiiaToken(ies_id=ies_id, token_hash=TOKEN_HASH, activo=True)
    db_session.add(token)
    db_session.commit()
    return {"ies_id": ies_id, "token": RAW_TOKEN}


def _mk_payload(ies_id: str):
    return {
        "ies_id": ies_id,
        "ciclo": "2025-1",
        "registros": [
            {"carrera_id": str(uuid.uuid4()), "ciclo": "2025-1", "matricula": 320, "egresados": 45},
            {"carrera_id": str(uuid.uuid4()), "ciclo": "2025-1", "matricula": 180, "egresados": 30},
        ],
    }


def _superadmin_token(client, db_session):
    unique = uuid.uuid4().hex[:8]
    ies = IES(nombre="IES SA SIIA", nombre_corto="SA")
    db_session.add(ies)
    db_session.flush()
    user = Usuario(
        username=f"sa_{unique}",
        hashed_password=_pwd.hash("pass"),
        ies_id=ies.id,
        rol="superadmin",
    )
    db_session.add(user)
    db_session.flush()
    resp = client.post("/auth/login", data={"username": user.username, "password": "pass"})
    assert resp.status_code == 200
    return resp.json()["access_token"]


def test_webhook_sin_token_devuelve_401(client, ies_id):
    resp = client.post("/siia/webhook", json=_mk_payload(ies_id))
    assert resp.status_code == 401


def test_webhook_token_invalido_devuelve_403(client, siia_ctx):
    resp = client.post("/siia/webhook", json=_mk_payload(siia_ctx["ies_id"]),
                       headers={"X-SIIA-Token": "bad_token"})
    assert resp.status_code == 403


def test_webhook_token_valido_inserta_registros(client, siia_ctx):
    resp = client.post("/siia/webhook", json=_mk_payload(siia_ctx["ies_id"]),
                       headers={"X-SIIA-Token": siia_ctx["token"]})
    assert resp.status_code == 200
    data = resp.json()
    assert data["recibidos"] == 2
    assert data["insertados"] == 2
    assert data["errores"] == 0


def test_webhook_idempotente_actualiza_en_lugar_de_duplicar(client, siia_ctx):
    payload = _mk_payload(siia_ctx["ies_id"])
    headers = {"X-SIIA-Token": siia_ctx["token"]}
    client.post("/siia/webhook", json=payload, headers=headers)
    resp = client.post("/siia/webhook", json=payload, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["actualizados"] == 2
    assert data["insertados"] == 0


def test_listar_datos_sin_auth_devuelve_401(client, ies_id):
    resp = client.get(f"/siia/datos/{ies_id}")
    assert resp.status_code == 401


def test_listar_datos_superadmin(client, db_session, siia_ctx):
    client.post("/siia/webhook", json=_mk_payload(siia_ctx["ies_id"]),
                headers={"X-SIIA-Token": siia_ctx["token"]})
    token = _superadmin_token(client, db_session)
    resp = client.get(f"/siia/datos/{siia_ctx['ies_id']}",
                      headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


def test_crear_token_superadmin(client, db_session):
    ies = IES(nombre="IES Token Test", nombre_corto="ITT")
    db_session.add(ies)
    db_session.flush()
    sa_token = _superadmin_token(client, db_session)
    resp = client.post(f"/siia/tokens/crear?ies_id={ies.id}",
                       headers={"Authorization": f"Bearer {sa_token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["token"].startswith("siia_")
    assert data["ies_id"] == ies.id


def test_revocar_token_superadmin(client, db_session, siia_ctx):
    sa_token = _superadmin_token(client, db_session)
    resp = client.delete(f"/siia/tokens/{siia_ctx['ies_id']}",
                         headers={"Authorization": f"Bearer {sa_token}"})
    assert resp.status_code == 200
    # Token revocado → webhook debe fallar
    resp2 = client.post("/siia/webhook", json=_mk_payload(siia_ctx["ies_id"]),
                        headers={"X-SIIA-Token": siia_ctx["token"]})
    assert resp2.status_code == 403


def test_revocar_token_inexistente_devuelve_404(client, db_session):
    sa_token = _superadmin_token(client, db_session)
    resp = client.delete("/siia/tokens/no-existe",
                         headers={"Authorization": f"Bearer {sa_token}"})
    assert resp.status_code == 404

# tests/api/test_pertinencia.py
import uuid
from unittest.mock import patch
from passlib.context import CryptContext
from pipeline.db.models import IES, Usuario

_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _superadmin_token(client, db_session):
    unique = uuid.uuid4().hex[:8]
    ies = IES(nombre="IES Superadmin", nombre_corto="SA")
    db_session.add(ies)
    db_session.flush()
    user = Usuario(
        username=f"superadmin_{unique}",
        hashed_password=_pwd.hash("pass"),
        ies_id=ies.id,
        rol="superadmin",
    )
    db_session.add(user)
    db_session.flush()
    resp = client.post("/auth/login", data={"username": user.username, "password": "pass"})
    assert resp.status_code == 200
    return resp.json()["access_token"]


PAYLOAD = {
    "nombre_contacto": "Ana Torres",
    "email_contacto": "ana@ejemplo.edu.mx",
    "ies_nombre": "Universidad Ejemplo",
    "carrera_nombre": "Ingeniería en Sistemas",
    "mensaje": "Queremos evaluar pertinencia ante IA.",
}


def test_crear_solicitud_devuelve_201(client):
    with patch("api.routers.pertinencia._send_confirmation"):
        resp = client.post("/pertinencia/solicitud", json=PAYLOAD)
    assert resp.status_code == 201
    data = resp.json()
    assert "id" in data
    assert data["estado"] == "pendiente"


def test_crear_solicitud_email_invalido_devuelve_422(client):
    bad = {**PAYLOAD, "email_contacto": "no-es-email"}
    resp = client.post("/pertinencia/solicitud", json=bad)
    assert resp.status_code == 422


def test_crear_solicitud_sin_mensaje_es_valido(client):
    sin_msg = {**PAYLOAD, "mensaje": None}
    with patch("api.routers.pertinencia._send_confirmation"):
        resp = client.post("/pertinencia/solicitud", json=sin_msg)
    assert resp.status_code == 201


def test_listar_solicitudes_sin_auth_devuelve_401(client):
    resp = client.get("/pertinencia/solicitudes")
    assert resp.status_code == 401


def test_listar_solicitudes_con_superadmin(client, db_session):
    with patch("api.routers.pertinencia._send_confirmation"):
        client.post("/pertinencia/solicitud", json=PAYLOAD)
    token = _superadmin_token(client, db_session)
    resp = client.get("/pertinencia/solicitudes", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
    assert len(resp.json()) >= 1


def test_patch_solicitud_cambia_estado(client, db_session):
    with patch("api.routers.pertinencia._send_confirmation"):
        post_resp = client.post("/pertinencia/solicitud", json=PAYLOAD)
    sol_id = post_resp.json()["id"]
    token = _superadmin_token(client, db_session)
    resp = client.patch(
        f"/pertinencia/solicitudes/{sol_id}",
        json={"estado": "en_revision"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["estado"] == "en_revision"


def test_patch_solicitud_estado_invalido_devuelve_422(client, db_session):
    with patch("api.routers.pertinencia._send_confirmation"):
        post_resp = client.post("/pertinencia/solicitud", json=PAYLOAD)
    sol_id = post_resp.json()["id"]
    token = _superadmin_token(client, db_session)
    resp = client.patch(
        f"/pertinencia/solicitudes/{sol_id}",
        json={"estado": "inventado"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 422


def test_patch_solicitud_inexistente_devuelve_404(client, db_session):
    token = _superadmin_token(client, db_session)
    resp = client.patch(
        "/pertinencia/solicitudes/no-existe",
        json={"estado": "completada"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 404


def test_patch_solicitud_completada_dispara_notificacion(client, db_session, monkeypatch):
    monkeypatch.setenv("RESEND_API_KEY", "test-key-resend")
    with patch("api.routers.pertinencia._send_confirmation"):
        post_resp = client.post("/pertinencia/solicitud", json=PAYLOAD)
    sol_id = post_resp.json()["id"]
    token = _superadmin_token(client, db_session)
    with patch("api.routers.pertinencia._notify_estado_change") as mock_notify:
        resp = client.patch(
            f"/pertinencia/solicitudes/{sol_id}",
            json={"estado": "completada"},
            headers={"Authorization": f"Bearer {token}"},
        )
    assert resp.status_code == 200
    mock_notify.assert_called_once()
    args = mock_notify.call_args
    assert args[0][1] == "completada"


def test_patch_solicitud_sin_cambio_no_notifica(client, db_session):
    with patch("api.routers.pertinencia._send_confirmation"):
        post_resp = client.post("/pertinencia/solicitud", json=PAYLOAD)
    sol_id = post_resp.json()["id"]
    token = _superadmin_token(client, db_session)
    # Marcar como pendiente (ya está pendiente → sin cambio)
    with patch("api.routers.pertinencia._notify_estado_change") as mock_notify:
        resp = client.patch(
            f"/pertinencia/solicitudes/{sol_id}",
            json={"estado": "pendiente"},
            headers={"Authorization": f"Bearer {token}"},
        )
    assert resp.status_code == 200
    mock_notify.assert_not_called()


def test_notify_estado_change_sin_resend_key_no_llama_httpx(monkeypatch):
    from api.routers.pertinencia import _notify_estado_change
    from pipeline.db.models import SolicitudPertinencia
    monkeypatch.setenv("RESEND_API_KEY", "")
    sol = SolicitudPertinencia(
        nombre_contacto="Ana",
        email_contacto="ana@test.mx",
        ies_nombre="UNAM",
        carrera_nombre="Derecho",
        estado="pendiente",
    )
    with patch("httpx.post") as mock_post:
        _notify_estado_change(sol, "completada")
    mock_post.assert_not_called()

# tests/api/test_auth.py
from passlib.context import CryptContext
from pipeline.db.models import IES, Usuario

_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _create_user(db_session, username: str, password: str, ies=None):
    if ies is None:
        ies = IES(nombre=f"IES {username}", nombre_corto=username[:3].upper())
        db_session.add(ies)
        db_session.flush()
    user = Usuario(
        username=username,
        hashed_password=_pwd.hash(password),
        ies_id=ies.id,
    )
    db_session.add(user)
    db_session.flush()
    return user, ies


def test_login_exitoso(client, db_session):
    _create_user(db_session, "rector_test", "secret123")
    resp = client.post("/auth/login", data={"username": "rector_test", "password": "secret123"})
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_password_incorrecta(client, db_session):
    _create_user(db_session, "rector_wrong", "correct")
    resp = client.post("/auth/login", data={"username": "rector_wrong", "password": "wrong"})
    assert resp.status_code == 401


def test_login_usuario_no_existe(client, db_session):
    resp = client.post("/auth/login", data={"username": "noexiste", "password": "cualquiera"})
    assert resp.status_code == 401


def test_login_usuario_inactivo(client, db_session):
    user, _ = _create_user(db_session, "rector_inactivo", "pass")
    user.activo = False
    db_session.flush()
    resp = client.post("/auth/login", data={"username": "rector_inactivo", "password": "pass"})
    assert resp.status_code == 401


def test_get_me_retorna_usuario(client, db_session):
    user, ies = _create_user(db_session, "me_test", "pass123")
    login = client.post("/auth/login", data={"username": "me_test", "password": "pass123"})
    token = login.json()["access_token"]
    resp = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["username"] == "me_test"
    assert data["ies_id"] == ies.id
    assert "rol" in data
    assert "ies_nombre" in data


def test_get_me_sin_token_retorna_401(client, db_session):
    resp = client.get("/auth/me")
    assert resp.status_code == 401

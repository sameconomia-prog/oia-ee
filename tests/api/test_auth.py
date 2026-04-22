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

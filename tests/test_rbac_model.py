# tests/test_rbac_model.py
from pipeline.db.models import Usuario


def test_usuario_has_rol_field(session):
    u = Usuario(
        username="test_rector",
        hashed_password="$2b$12$fake",
        ies_id="ies-001",
        rol="admin_ies",
    )
    session.add(u)
    session.flush()
    assert u.rol == "admin_ies"


def test_usuario_default_rol_is_viewer(session):
    u = Usuario(
        username="test_viewer",
        hashed_password="$2b$12$fake",
        ies_id="ies-002",
    )
    session.add(u)
    session.flush()
    assert u.rol == "viewer"


def test_refresh_token_model(session):
    from pipeline.db.models import RefreshToken
    from datetime import datetime, timedelta, UTC

    rt = RefreshToken(
        usuario_id="usr-001",
        token="tok-abc123",
        expires_at=datetime.now(UTC) + timedelta(days=30),
    )
    session.add(rt)
    session.flush()
    assert rt.id is not None
    assert rt.revocado is False

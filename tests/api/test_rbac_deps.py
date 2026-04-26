# tests/api/test_rbac_deps.py
import pytest
from fastapi import HTTPException
from unittest.mock import MagicMock
from api.deps import require_roles
from pipeline.db.models import Usuario


def _make_user(rol: str) -> Usuario:
    u = MagicMock(spec=Usuario)
    u.rol = rol
    u.activo = True
    return u


def test_require_roles_allows_matching_role():
    dep = require_roles("admin_ies", "superadmin")
    user = _make_user("admin_ies")
    result = dep(current_user=user)
    assert result == user


def test_require_roles_blocks_wrong_role():
    dep = require_roles("superadmin")
    user = _make_user("viewer")
    with pytest.raises(HTTPException) as exc_info:
        dep(current_user=user)
    assert exc_info.value.status_code == 403
    assert "viewer" in exc_info.value.detail
    assert "superadmin" in exc_info.value.detail


def test_require_roles_superadmin_passes_any():
    dep = require_roles("researcher")
    user = _make_user("superadmin")
    result = dep(current_user=user)
    assert result == user

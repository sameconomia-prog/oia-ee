# tests/api/test_auth_refresh.py

def test_refresh_endpoint_returns_401_with_invalid_token(client):
    """POST /auth/refresh con refresh_token inválido devuelve 401."""
    response = client.post("/auth/refresh", json={"refresh_token": "invalid-token-xyz"})
    assert response.status_code == 401


def test_logout_endpoint_accepts_any_token(client):
    """POST /auth/logout con cualquier token devuelve 200 (idempotente)."""
    response = client.post("/auth/logout", json={"refresh_token": "any-token-xyz"})
    assert response.status_code == 200
    assert "detail" in response.json()

def test_health_endpoint_accessible(client):
    """El endpoint /health es público y accesible."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["version"] == "0.9.0"


def test_rate_limit_tiers_defined():
    """Los tiers de rate limiting están definidos correctamente."""
    from api.middleware.rate_limit import RATE_LIMITS
    assert RATE_LIMITS["anon"] == "30/minute"
    assert RATE_LIMITS["researcher"] == "300/minute"
    assert RATE_LIMITS["premium"] == "unlimited"

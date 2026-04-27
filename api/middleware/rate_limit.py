"""Rate limiting tiers para OIA-EE.

Tiers:
  anon       — 30 req/min (API pública sin key)
  researcher — 300 req/min (API key de investigador)
  premium    — sin límite (instituciones con contrato)
"""
from fastapi_limiter import FastAPILimiter
from fastapi_limiter.depends import RateLimiter

RATE_LIMITS = {
    "anon": "30/minute",
    "researcher": "300/minute",
    "premium": "unlimited",
}

# Dependencias FastAPI listas para usar en routers
anon_limit = RateLimiter(times=30, seconds=60)
researcher_limit = RateLimiter(times=300, seconds=60)


class GracefulRateLimiter:
    """Wraps RateLimiter with graceful degradation for Redis connection errors."""

    def __init__(self, limiter: RateLimiter):
        self.limiter = limiter

    async def __call__(self, request, response):
        try:
            await self.limiter(request=request, response=response)
        except Exception:
            # Redis no disponible o error de conexión — graceful degradation
            pass


def dynamic_rate_limiter(tier: str):
    """Retorna instancia RateLimiter para el tier dado, o None si Redis no está disponible o es premium."""
    try:
        if FastAPILimiter.redis is None:
            return None
    except AttributeError:
        return None
    if tier == "premium":
        return None
    elif tier == "researcher":
        return GracefulRateLimiter(RateLimiter(times=300, seconds=60))
    return GracefulRateLimiter(RateLimiter(times=30, seconds=60))

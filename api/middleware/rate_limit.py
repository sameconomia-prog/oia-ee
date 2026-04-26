"""Rate limiting tiers para OIA-EE.

Tiers:
  anon       — 30 req/min (API pública sin key)
  researcher — 300 req/min (API key de investigador)
  premium    — sin límite (instituciones con contrato)
"""
from fastapi_limiter.depends import RateLimiter

RATE_LIMITS = {
    "anon": "30/minute",
    "researcher": "300/minute",
    "premium": "unlimited",
}

# Dependencias FastAPI listas para usar en routers
anon_limit = RateLimiter(times=30, seconds=60)
researcher_limit = RateLimiter(times=300, seconds=60)

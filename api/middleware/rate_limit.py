"""Rate limiting tiers para OIA-EE.

Tiers:
  anon       — 30 req/min (API pública sin key)
  researcher — 300 req/min (API key de investigador)
  premium    — sin límite (instituciones con contrato)

Redis opcional: si REDIS_URL está disponible, usa fastapi-limiter (distribuido).
Si no, usa sliding-window en memoria (suficiente para instancia única en Railway).
"""
import time
from collections import defaultdict
from threading import Lock

from fastapi import HTTPException, Request, Response, status
from fastapi_limiter import FastAPILimiter

RATE_LIMITS: dict[str, tuple[int, int] | None] = {
    "anon": (30, 60),
    "researcher": (300, 60),
    "premium": None,
}


class _InMemoryRateLimiter:
    """Sliding-window rate limiter. Thread-safe, single-instance."""

    def __init__(self) -> None:
        self._windows: dict[str, list[float]] = defaultdict(list)
        self._lock = Lock()

    def is_allowed(self, key: str, times: int, seconds: int) -> bool:
        now = time.monotonic()
        cutoff = now - seconds
        with self._lock:
            self._windows[key] = [t for t in self._windows[key] if t > cutoff]
            if len(self._windows[key]) < times:
                self._windows[key].append(now)
                return True
            return False


_mem_limiter = _InMemoryRateLimiter()


def _redis_available() -> bool:
    try:
        return FastAPILimiter.redis is not None
    except AttributeError:
        return False


def dynamic_rate_limiter(tier: str):
    """Retorna RateLimiter Redis para el tier, o None si Redis no está disponible o es premium."""
    if not _redis_available() or tier == "premium":
        return None
    from fastapi_limiter.depends import RateLimiter
    if tier == "researcher":
        return RateLimiter(times=300, seconds=60)
    return RateLimiter(times=30, seconds=60)


async def apply_rate_limit(request: Request, response: Response, tier: str) -> None:
    """Aplica rate limiting: Redis si disponible, sliding-window en memoria como fallback.
    No-op para tier premium."""
    if tier == "premium":
        return

    limits = RATE_LIMITS.get(tier) or RATE_LIMITS["anon"]
    times, seconds = limits  # type: ignore[misc]

    if _redis_available():
        from fastapi_limiter.depends import RateLimiter
        await RateLimiter(times=times, seconds=seconds)(request=request, response=response)
        return

    client_ip = request.client.host if request.client else "unknown"
    key = f"rl:{tier}:{client_ip}"
    if not _mem_limiter.is_allowed(key, times, seconds):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit excedido: {times} req/{seconds}s para tier '{tier}'.",
        )

# api/deps.py
import hashlib
import os
from datetime import date
from typing import Callable
from fastapi import Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from pipeline.db import get_session
from pipeline.db.models import Usuario
from pipeline.db.models_apikey import ApiKey
from api.middleware.rate_limit import dynamic_rate_limiter

_SECRET = os.getenv("JWT_SECRET_KEY", "dev-secret-change-in-prod")
_ALGORITHM = "HS256"

_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_db():
    with get_session() as session:
        yield session


def get_current_user(
    token: str = Depends(_oauth2_scheme),
    db: Session = Depends(get_db),
) -> Usuario:
    try:
        payload = jwt.decode(token, _SECRET, algorithms=[_ALGORITHM])
        username: str = payload.get("sub", "")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")
    user = db.query(Usuario).filter_by(username=username, activo=True).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no encontrado")
    return user


def require_roles(*roles: str) -> Callable:
    """Factory: returns a FastAPI dependency that enforces role membership.

    superadmin siempre pasa, sin importar los roles requeridos.
    """
    def _check(current_user: Usuario = Depends(get_current_user)) -> Usuario:
        if current_user.rol == "superadmin":
            return current_user
        if current_user.rol not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Rol requerido: {', '.join(roles)}. Tu rol: {current_user.rol}",
            )
        return current_user
    return _check


# Shortcuts comunes
get_admin_user = require_roles("admin_ies", "superadmin")
get_researcher_user = require_roles("researcher", "admin_ies", "superadmin")
get_superadmin_user = require_roles("superadmin")


def get_api_key_tier(request: Request, db: Session = Depends(get_db)) -> str:
    """Lee X-API-Key, valida contra BD, retorna tier. Siempre retorna 'anon' en caso de duda."""
    raw_key = request.headers.get("X-API-Key", "")
    if not raw_key:
        return "anon"
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    api_key = db.query(ApiKey).filter_by(key_hash=key_hash).first()
    if not api_key:
        return "anon"
    if api_key.revoked:
        return "anon"
    if api_key.expires_at and api_key.expires_at < date.today():
        return "anon"
    return api_key.tier


async def rate_limit_public(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> None:
    """Dependency: aplica rate limiting según tier del API key (o anon si no hay key).
    Graceful degradation: si Redis no está disponible, no hace nada."""
    tier = get_api_key_tier(request, db)
    limiter = dynamic_rate_limiter(tier)
    if limiter is not None:
        try:
            await limiter(request=request, response=response)
        except Exception:
            # Redis no disponible o error de conexión — graceful degradation
            pass

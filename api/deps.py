# api/deps.py
import os
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from pipeline.db import get_session
from pipeline.db.models import Usuario

_SECRET = os.getenv("JWT_SECRET_KEY", "dev-secret-change-in-prod")
_ALGORITHM = "HS256"

_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_db():
    """FastAPI dependency: yields a DB session."""
    with get_session() as session:
        yield session


def get_current_user(token: str = Depends(_oauth2_scheme), db: Session = Depends(get_db)) -> Usuario:
    try:
        payload = jwt.decode(token, _SECRET, algorithms=[_ALGORITHM])
        username: str = payload.get("sub", "")
        ies_id: str = payload.get("ies_id", "")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")
    user = db.query(Usuario).filter_by(username=username, activo=True).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no encontrado")
    return user

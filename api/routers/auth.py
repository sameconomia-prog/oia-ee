# api/routers/auth.py
import os
import secrets
from datetime import datetime, timedelta, UTC
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from jose import jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from sqlalchemy.orm import Session
from api.deps import get_db
from pipeline.db.models import Usuario, RefreshToken

router = APIRouter()

_SECRET = os.getenv("JWT_SECRET_KEY", "dev-secret-change-in-prod")
_ALGORITHM = "HS256"
_ACCESS_EXPIRE_MINUTES = 15        # 15 minutos
_REFRESH_EXPIRE_DAYS = 30          # 30 días

_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")


class RefreshRequest(BaseModel):
    refresh_token: str


def _create_access_token(username: str, ies_id: str, rol: str) -> str:
    payload = {
        "sub": username,
        "ies_id": ies_id,
        "rol": rol,
        "exp": datetime.now(UTC) + timedelta(minutes=_ACCESS_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, _SECRET, algorithm=_ALGORITHM)


def _create_refresh_token(user: Usuario, db: Session) -> str:
    token = secrets.token_urlsafe(48)
    rt = RefreshToken(
        usuario_id=user.id,
        token=token,
        expires_at=datetime.now(UTC) + timedelta(days=_REFRESH_EXPIRE_DAYS),
    )
    db.add(rt)
    db.commit()
    return token


@router.post("/login")
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(Usuario).filter_by(username=form.username, activo=True).first()
    if not user or not _pwd.verify(form.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales inválidas")
    access_token = _create_access_token(user.username, user.ies_id, user.rol)
    refresh_token = _create_refresh_token(user, db)
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


@router.post("/refresh")
def refresh(body: RefreshRequest, db: Session = Depends(get_db)):
    rt = db.query(RefreshToken).filter_by(token=body.refresh_token, revocado=False).first()
    if not rt or rt.expires_at.replace(tzinfo=None) < datetime.now(UTC).replace(tzinfo=None):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token inválido o expirado")
    user = db.query(Usuario).filter_by(id=rt.usuario_id, activo=True).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no encontrado")
    new_access = _create_access_token(user.username, user.ies_id, user.rol)
    return {"access_token": new_access, "token_type": "bearer"}


# TODO(security): almacenar hash SHA-256 del token en lugar del token directo
# para eliminar timing side-channel en comparaciones SQL. Prioridad baja dado
# que tokens son de 64 chars (2^288 espacio de búsqueda). Ver P0 security review.
@router.post("/logout")
def logout(body: RefreshRequest, db: Session = Depends(get_db)):
    rt = db.query(RefreshToken).filter_by(token=body.refresh_token).first()
    if rt:
        rt.revocado = True
        db.commit()
    return {"detail": "Sesión cerrada"}

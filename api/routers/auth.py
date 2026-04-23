# api/routers/auth.py
import os
from datetime import datetime, timedelta, UTC
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from jose import jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from api.deps import get_db
from pipeline.db.models import Usuario

router = APIRouter()

_SECRET = os.getenv("JWT_SECRET_KEY", "dev-secret-change-in-prod")
_ALGORITHM = "HS256"
_EXPIRE_MINUTES = 60 * 24  # 24 horas

_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _create_token(username: str, ies_id: str) -> str:
    payload = {
        "sub": username,
        "ies_id": ies_id,
        "exp": datetime.now(UTC) + timedelta(minutes=_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, _SECRET, algorithm=_ALGORITHM)


@router.post("/login")
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(Usuario).filter_by(username=form.username, activo=True).first()
    if not user or not _pwd.verify(form.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales inválidas")
    token = _create_token(user.username, user.ies_id)
    return {"access_token": token, "token_type": "bearer"}

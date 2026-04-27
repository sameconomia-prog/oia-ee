# api/routers/api_keys.py
import hashlib
import secrets
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from api.deps import get_db, require_roles
from api.schemas import ApiKeyCreateIn, ApiKeyCreateOut, ApiKeyListItem, ApiKeyRevokeOut
from pipeline.db.models_apikey import ApiKey

router = APIRouter()

_require_superadmin = require_roles("superadmin")


@router.post("", response_model=ApiKeyCreateOut)
def crear_api_key(
    body: ApiKeyCreateIn,
    db: Session = Depends(get_db),
    _: object = Depends(_require_superadmin),
):
    raw_key = "sk_oa_" + secrets.token_hex(16)
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    key_prefix = raw_key[:8]

    expires_at = None
    if body.expires_at:
        try:
            expires_at = date.fromisoformat(body.expires_at)
        except ValueError:
            raise HTTPException(status_code=422, detail="expires_at debe ser YYYY-MM-DD")

    api_key = ApiKey(
        key_hash=key_hash,
        key_prefix=key_prefix,
        name=body.name,
        email=body.email,
        tier=body.tier,
        expires_at=expires_at,
    )
    db.add(api_key)
    db.commit()

    return ApiKeyCreateOut(
        id=api_key.id,
        raw_key=raw_key,
        key_prefix=key_prefix,
        name=api_key.name,
        email=api_key.email,
        tier=api_key.tier,
        expires_at=str(api_key.expires_at) if api_key.expires_at else None,
    )


@router.get("", response_model=list[ApiKeyListItem])
def listar_api_keys(
    db: Session = Depends(get_db),
    _: object = Depends(_require_superadmin),
):
    keys = db.query(ApiKey).order_by(ApiKey.created_at.desc()).all()
    return [
        ApiKeyListItem(
            id=k.id,
            key_prefix=k.key_prefix,
            name=k.name,
            email=k.email,
            tier=k.tier,
            expires_at=str(k.expires_at) if k.expires_at else None,
            revoked=k.revoked,
            created_at=k.created_at,
        )
        for k in keys
    ]


@router.delete("/{key_id}", response_model=ApiKeyRevokeOut)
def revocar_api_key(
    key_id: str,
    db: Session = Depends(get_db),
    _: object = Depends(_require_superadmin),
):
    api_key = db.query(ApiKey).filter_by(id=key_id).first()
    if not api_key:
        raise HTTPException(status_code=404, detail="API key no encontrada")
    api_key.revoked = True
    db.commit()
    return ApiKeyRevokeOut(id=api_key.id, revoked=True)

# api/routers/siia.py
"""
P11 — Integración SIIA (Enterprise)
Webhook para que IES Enterprise envíen datos de matrícula en tiempo real
desde su SIIA (Sistema Institucional de Información Académica).
"""
import hashlib
import json
import secrets
import structlog
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from api.deps import get_db, get_superadmin_user
from pipeline.db.models_siia import SiiaMatricula, SiiaToken

logger = structlog.get_logger()
router = APIRouter()


# ── Schemas ────────────────────────────────────────────────────────────────

class SiiaMatriculaItem(BaseModel):
    carrera_id: str | None = None
    ciclo: str
    nivel: str | None = None
    matricula: int | None = None
    egresados: int | None = None
    titulados: int | None = None
    costo_anual_mxn: int | None = None
    cve_sep: str | None = None


class SiiaWebhookPayload(BaseModel):
    ies_id: str
    ciclo: str | None = None
    registros: list[SiiaMatriculaItem]


class SiiaWebhookResult(BaseModel):
    recibidos: int
    insertados: int
    actualizados: int
    errores: int


class SiiaTokenOut(BaseModel):
    ies_id: str
    token: str


# ── Auth helper ────────────────────────────────────────────────────────────

def _verify_siia_token(ies_id: str, raw_token: str, db: Session) -> bool:
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    record = db.query(SiiaToken).filter_by(ies_id=ies_id, activo=True).first()
    if not record or record.token_hash != token_hash:
        return False
    record.ultimo_uso = datetime.now(timezone.utc)
    db.commit()
    return True


# ── Endpoints ──────────────────────────────────────────────────────────────

@router.post("/siia/webhook", response_model=SiiaWebhookResult)
def recibir_datos_siia(
    payload: SiiaWebhookPayload,
    x_siia_token: str = Header(None, alias="X-SIIA-Token"),
    db: Session = Depends(get_db),
):
    """
    Webhook para IES Enterprise — recibe datos de matrícula en tiempo real
    desde SIIA institucional. Autenticación: header X-SIIA-Token.
    """
    if not x_siia_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Se requiere X-SIIA-Token")

    if not _verify_siia_token(payload.ies_id, x_siia_token, db):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Token SIIA inválido o inactivo")

    insertados = actualizados = errores = 0

    for item in payload.registros:
        ciclo = item.ciclo or payload.ciclo or "N/D"
        try:
            existing = db.query(SiiaMatricula).filter_by(
                ies_id=payload.ies_id,
                carrera_id=item.carrera_id,
                ciclo=ciclo,
            ).first()

            raw = json.dumps(item.model_dump())

            if existing:
                existing.matricula = item.matricula
                existing.egresados = item.egresados
                existing.titulados = item.titulados
                existing.costo_anual_mxn = item.costo_anual_mxn
                existing.cve_sep = item.cve_sep
                existing.nivel = item.nivel
                existing.payload_raw = raw
                existing.procesado = False
                actualizados += 1
            else:
                db.add(SiiaMatricula(
                    ies_id=payload.ies_id,
                    carrera_id=item.carrera_id,
                    ciclo=ciclo,
                    nivel=item.nivel,
                    matricula=item.matricula,
                    egresados=item.egresados,
                    titulados=item.titulados,
                    costo_anual_mxn=item.costo_anual_mxn,
                    cve_sep=item.cve_sep,
                    payload_raw=raw,
                ))
                insertados += 1
        except Exception as exc:
            logger.warning("siia_item_error", exc_info=False, error=str(exc))
            db.rollback()
            errores += 1

    db.commit()
    logger.info("siia_webhook", ies_id=payload.ies_id, insertados=insertados, actualizados=actualizados, errores=errores)
    return SiiaWebhookResult(
        recibidos=len(payload.registros),
        insertados=insertados,
        actualizados=actualizados,
        errores=errores,
    )


@router.get("/siia/datos/{ies_id}", dependencies=[Depends(get_superadmin_user)])
def listar_datos_siia(ies_id: str, ciclo: str | None = None, db: Session = Depends(get_db)):
    """Lista los datos SIIA recibidos para una IES (superadmin)."""
    q = db.query(SiiaMatricula).filter_by(ies_id=ies_id)
    if ciclo:
        q = q.filter(SiiaMatricula.ciclo == ciclo)
    rows = q.order_by(SiiaMatricula.recibido_at.desc()).limit(200).all()
    return [
        {
            "id": r.id,
            "carrera_id": r.carrera_id,
            "ciclo": r.ciclo,
            "nivel": r.nivel,
            "matricula": r.matricula,
            "egresados": r.egresados,
            "titulados": r.titulados,
            "costo_anual_mxn": r.costo_anual_mxn,
            "cve_sep": r.cve_sep,
            "recibido_at": r.recibido_at.isoformat() if r.recibido_at else None,
            "procesado": r.procesado,
        }
        for r in rows
    ]


@router.post("/siia/tokens/crear", response_model=SiiaTokenOut, dependencies=[Depends(get_superadmin_user)])
def crear_token_siia(ies_id: str, db: Session = Depends(get_db)):
    """Genera un token SIIA para una IES Enterprise (superadmin)."""
    raw_token = f"siia_{secrets.token_hex(32)}"
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()

    existing = db.query(SiiaToken).filter_by(ies_id=ies_id).first()
    if existing:
        existing.token_hash = token_hash
        existing.activo = True
        existing.creado_at = datetime.now(timezone.utc)
        existing.ultimo_uso = None
    else:
        db.add(SiiaToken(ies_id=ies_id, token_hash=token_hash))
    db.commit()
    return SiiaTokenOut(ies_id=ies_id, token=raw_token)


@router.delete("/siia/tokens/{ies_id}", dependencies=[Depends(get_superadmin_user)])
def revocar_token_siia(ies_id: str, db: Session = Depends(get_db)):
    """Revoca el token SIIA de una IES (superadmin)."""
    record = db.query(SiiaToken).filter_by(ies_id=ies_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Token no encontrado")
    record.activo = False
    db.commit()
    return {"ok": True, "ies_id": ies_id}

# api/routers/admin.py
import os
import logging
from fastapi import APIRouter, Header, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from api.deps import get_db
from pipeline.ingest_gdelt import run_gdelt_pipeline

logger = logging.getLogger(__name__)
router = APIRouter()


class IngestResultOut(BaseModel):
    fetched: int
    stored: int
    classified: int
    embedded: int


@router.post("/ingest/gdelt", response_model=IngestResultOut)
def ingest_gdelt(
    x_admin_key: str = Header(None),
    db: Session = Depends(get_db),
):
    admin_key = os.getenv("ADMIN_API_KEY", "")
    if not admin_key or x_admin_key != admin_key:
        raise HTTPException(status_code=401, detail="Unauthorized")
    result = run_gdelt_pipeline(
        session=db,
        api_key_claude=os.getenv("ANTHROPIC_API_KEY", ""),
        api_key_voyage=os.getenv("VOYAGE_API_KEY", ""),
    )
    return IngestResultOut(**vars(result))

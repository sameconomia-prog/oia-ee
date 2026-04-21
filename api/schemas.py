# api/schemas.py
from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class NoticiaOut(BaseModel):
    id: str
    titulo: str
    url: str
    fuente: Optional[str] = None
    sector: Optional[str] = None
    tipo_impacto: Optional[str] = None
    fecha_ingesta: Optional[datetime] = None

    model_config = {"from_attributes": True}


class D1Out(BaseModel):
    iva: float
    bes: float
    vac: float
    score: float


class D2Out(BaseModel):
    ioe: float
    ihe: float
    iea: float
    score: float


class KpiOut(BaseModel):
    carrera_id: str
    d1_obsolescencia: D1Out
    d2_oportunidades: D2Out

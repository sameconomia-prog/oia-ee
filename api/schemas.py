# api/schemas.py
from pydantic import BaseModel, Field
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


class D3Out(BaseModel):
    tdm: float
    tvc: float
    brs: float
    ice: float
    score: float


class D4Out(BaseModel):
    tra: float
    irf: float
    cad: float
    score: float


class D5Out(BaseModel):
    idr: float
    icg: float
    ies_s: float
    score: float


class D6Out(BaseModel):
    iei: float
    crc: float
    roi_e: float
    score: float


class KpiOut(BaseModel):
    carrera_id: str
    d1_obsolescencia: D1Out
    d2_oportunidades: D2Out
    d3_mercado: D3Out
    d6_estudiantil: D6Out


class IesKpiOut(BaseModel):
    ies_id: str
    d4_institucional: D4Out


class EstadoKpiOut(BaseModel):
    estado: str
    d5_geografia: D5Out


class D7Out(BaseModel):
    isn: float
    vdm: float
    score: float


class NoticiasKpiOut(BaseModel):
    d7_noticias: D7Out


class IesOut(BaseModel):
    id: str
    nombre: str
    nombre_corto: Optional[str] = None


class CarreraKpiOut(BaseModel):
    id: str
    nombre: str
    matricula: Optional[int] = None
    kpi: Optional[KpiOut] = None


class AlertaItemOut(BaseModel):
    id: str
    carrera_nombre: str
    tipo: str
    severidad: str
    titulo: str
    mensaje: Optional[str] = None
    fecha: str


class RectorOut(BaseModel):
    ies: IesOut
    carreras: list[CarreraKpiOut]
    alertas: list[AlertaItemOut]


class KpisNacionalResumenOut(BaseModel):
    total_carreras: int
    promedio_d1: float
    promedio_d2: float
    promedio_d3: float
    promedio_d6: float
    carreras_riesgo_alto: int
    carreras_oportunidad_alta: int


class AlertaDBOut(BaseModel):
    id: str
    ies_id: str
    carrera_id: str
    carrera_nombre: str
    tipo: str
    severidad: str
    titulo: str
    mensaje: str | None = None
    fecha: str
    leida: bool


class AlertasHistorialOut(BaseModel):
    alertas: list[AlertaDBOut]
    total: int


class AlertaLeidaOut(BaseModel):
    id: str
    leida: bool


class SimularInput(BaseModel):
    ies_id: str
    carrera_id: str
    carrera_nombre: str
    iva: float = Field(ge=0, le=1)
    bes: float = Field(ge=0, le=1)
    vac: float = Field(ge=0, le=1)
    ioe: float = Field(ge=0, le=1)
    ihe: float = Field(ge=0, le=1)
    iea: float = Field(ge=0, le=1)


class SimularResult(BaseModel):
    id: str
    carrera_nombre: str
    d1_score: float
    d2_score: float
    iva: float
    bes: float
    vac: float
    ioe: float
    ihe: float
    iea: float
    fecha: str


class EscenarioOut(BaseModel):
    id: str
    carrera_nombre: str
    carrera_id: str
    d1_score: float
    d2_score: float
    iva: float
    bes: float
    vac: float
    ioe: float
    ihe: float
    iea: float
    fecha: str


class EscenariosHistorialOut(BaseModel):
    escenarios: list[EscenarioOut]
    total: int


class CrearUsuarioIn(BaseModel):
    username: str
    password: str
    ies_id: str
    email: Optional[str] = None


class UsuarioOut(BaseModel):
    id: str
    username: str
    ies_id: str
    activo: bool
    email: Optional[str] = None

    model_config = {"from_attributes": True}


class SkillFreqOut(BaseModel):
    nombre: str
    count: int


class TopRiesgoItemOut(BaseModel):
    carrera_id: str
    nombre: str
    d1_score: float
    d2_score: float
    matricula: Optional[int] = None


class VacantePublicoOut(BaseModel):
    id: str
    titulo: str
    empresa: Optional[str] = None
    sector: Optional[str] = None
    skills: list[str] = []
    salario_min: Optional[int] = None
    salario_max: Optional[int] = None
    estado: Optional[str] = None
    nivel_educativo: Optional[str] = None
    experiencia_anios: Optional[int] = None
    fecha_pub: Optional[str] = None

# OIA-EE Sprint 2 — KPI Engine + FastAPI + Embeddings

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** KPI Engine D1/D2 funcional, FastAPI con 5 endpoints, y embeddings semánticos con búsqueda por similitud — todo cubierto con ~22 tests nuevos.

**Architecture:** Tres módulos independientes sobre SQLAlchemy del Sprint 1. KPI Engine = funciones puras testeables con SQLite. FastAPI usa `TestClient` + dependency override para tests. Embeddings usan `embedding_json` (Text) existente con cosine similarity en Python.

**Tech Stack:** Python 3.12 · FastAPI 0.111 · SQLAlchemy 2 · httpx · respx · pytest · Voyage AI embeddings API

---

## Mapa de archivos

| Archivo | Responsabilidad |
|---------|----------------|
| `pipeline/kpi_engine/__init__.py` | Package vacío |
| `pipeline/kpi_engine/d1_obsolescencia.py` | IVA + BES + VAC → D1Result |
| `pipeline/kpi_engine/d2_oportunidades.py` | IOE + IHE + IEA → D2Result |
| `pipeline/kpi_engine/kpi_runner.py` | Orquesta D1+D2 para una carrera_id |
| `api/__init__.py` | Package vacío |
| `api/main.py` | FastAPI app + include_routers |
| `api/deps.py` | `get_db()` dependency (una sola definición) |
| `api/schemas.py` | Pydantic response models |
| `api/routers/__init__.py` | Package vacío |
| `api/routers/noticias.py` | GET /noticias, GET /noticias/{id}, GET /noticias/buscar |
| `api/routers/kpis.py` | GET /kpis/carrera/{id} |
| `pipeline/utils/embeddings.py` | embed_text + store_embedding + search_similar |
| `tests/kpi_engine/__init__.py` | Package vacío |
| `tests/kpi_engine/test_d1.py` | 4 tests D1 |
| `tests/kpi_engine/test_d2.py` | 4 tests D2 |
| `tests/kpi_engine/test_kpi_runner.py` | 2 tests runner |
| `tests/api/__init__.py` | Package vacío |
| `tests/api/conftest.py` | TestClient + DB override fixture |
| `tests/api/test_noticias.py` | 5 tests noticias |
| `tests/api/test_kpis.py` | 3 tests KPIs |
| `tests/utils/test_embeddings.py` | 4 tests embeddings |

---

## Task 1: KPI Engine D1 — Obsolescencia

**Files:**
- Create: `pipeline/kpi_engine/__init__.py`
- Create: `pipeline/kpi_engine/d1_obsolescencia.py`
- Create: `tests/kpi_engine/__init__.py`
- Create: `tests/kpi_engine/test_d1.py`

- [ ] **Step 1: Crear directorios y packages vacíos**

```bash
mkdir -p pipeline/kpi_engine tests/kpi_engine
touch pipeline/kpi_engine/__init__.py tests/kpi_engine/__init__.py
```

- [ ] **Step 2: Crear `tests/kpi_engine/test_d1.py`**

```python
# tests/kpi_engine/test_d1.py
import json
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from pipeline.db.models import Base, Carrera, CarreraIES, Ocupacion, Vacante
from pipeline.kpi_engine.d1_obsolescencia import calcular_iva, calcular_bes, calcular_vac, calcular_d1


@pytest.fixture
def session():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    s = Session()
    yield s
    s.rollback()
    s.close()


def _carrera(session, onet_codes=None):
    c = Carrera(
        nombre_norm="Ingeniería en Sistemas",
        onet_codes_relacionados=json.dumps(onet_codes or ["15-1252.00"]),
    )
    session.add(c)
    session.flush()
    return c


def _carrera_ies(session, carrera, plan_skills=None, egresados=100, matricula=500):
    cie = CarreraIES(
        carrera_id=carrera.id,
        ciclo="2024/2",
        matricula=matricula,
        egresados=egresados,
        plan_estudio_skills=json.dumps(plan_skills or ["Python", "SQL", "Java"]),
    )
    session.add(cie)
    session.flush()
    return cie


def test_calcular_iva_con_ocupacion(session):
    c = _carrera(session, onet_codes=["15-1252.00"])
    occ = Ocupacion(onet_code="15-1252.00", nombre="Software Developers", p_automatizacion=0.18)
    session.add(occ)
    session.flush()
    iva = calcular_iva(c, session)
    assert iva == pytest.approx(0.18, abs=0.01)


def test_calcular_iva_sin_ocupaciones_retorna_default(session):
    c = _carrera(session, onet_codes=[])
    iva = calcular_iva(c, session)
    assert iva == 0.5


def test_calcular_bes_con_overlap(session):
    c = _carrera(session)
    cie = _carrera_ies(session, c, plan_skills=["Python", "SQL", "Java"])
    v = Vacante(titulo="Dev", skills=json.dumps(["Python", "Docker", "Kubernetes"]), fuente="stps")
    session.add(v)
    session.flush()
    bes = calcular_bes(cie, session)
    assert 0.0 <= bes <= 1.0


def test_calcular_d1_score_en_rango(session):
    c = _carrera(session)
    occ = Ocupacion(onet_code="15-1252.00", nombre="Dev", p_automatizacion=0.45)
    session.add(occ)
    cie = _carrera_ies(session, c)
    session.flush()
    result = calcular_d1(c, cie, session)
    assert 0.0 <= result.score <= 1.0
    assert 0.0 <= result.iva <= 1.0
    assert 0.0 <= result.bes <= 1.0
    assert 0.0 <= result.vac <= 1.0
```

- [ ] **Step 3: Verificar que los tests fallan**

```bash
cd /Users/arturoaguilar/Documents/OIA-EE
source pipeline/.venv/bin/activate
PYTHONPATH=. pytest tests/kpi_engine/test_d1.py -v 2>&1 | head -15
```

Salida esperada: `FAILED` con `ModuleNotFoundError: No module named 'pipeline.kpi_engine.d1_obsolescencia'`

- [ ] **Step 4: Crear `pipeline/kpi_engine/d1_obsolescencia.py`**

```python
# pipeline/kpi_engine/d1_obsolescencia.py
import json
import logging
from dataclasses import dataclass
from sqlalchemy.orm import Session
from pipeline.db.models import Ocupacion, Vacante, CarreraIES, Carrera

logger = logging.getLogger(__name__)


@dataclass
class D1Result:
    iva: float
    bes: float
    vac: float
    score: float


def calcular_iva(carrera: Carrera, session: Session) -> float:
    """Promedio de p_automatizacion de ocupaciones ONET relacionadas. Default 0.5 si no hay datos."""
    try:
        codes = json.loads(carrera.onet_codes_relacionados or "[]")
    except json.JSONDecodeError:
        return 0.5
    if not codes:
        return 0.5
    ocupaciones = session.query(Ocupacion).filter(Ocupacion.onet_code.in_(codes)).all()
    vals = [float(o.p_automatizacion) for o in ocupaciones if o.p_automatizacion is not None]
    return sum(vals) / len(vals) if vals else 0.5


def calcular_bes(carrera_ies: CarreraIES, session: Session) -> float:
    """Brecha entre skills del plan de estudios y skills demandadas en vacantes. Alta brecha = peor."""
    try:
        plan_skills = set(s.lower().strip() for s in json.loads(carrera_ies.plan_estudio_skills or "[]"))
    except json.JSONDecodeError:
        return 0.5
    if not plan_skills:
        return 0.5
    vacantes = session.query(Vacante).limit(200).all()
    demanded: set[str] = set()
    for v in vacantes:
        try:
            demanded.update(s.lower().strip() for s in json.loads(v.skills or "[]"))
        except Exception:
            pass
    if not demanded:
        return 0.5
    overlap = len(plan_skills & demanded)
    return 1.0 - (overlap / len(plan_skills))


def calcular_vac(carrera_ies: CarreraIES, session: Session) -> float:
    """Más vacantes disponibles = menor obsolescencia (resultado invertido)."""
    egresados = max(1, carrera_ies.egresados or 1)
    n_vacantes = session.query(Vacante).count()
    ratio = min(1.0, n_vacantes / egresados)
    return 1.0 - ratio


def calcular_d1(carrera: Carrera, carrera_ies: CarreraIES, session: Session) -> D1Result:
    iva = calcular_iva(carrera, session)
    bes = calcular_bes(carrera_ies, session)
    vac = calcular_vac(carrera_ies, session)
    score = iva * 0.5 + bes * 0.3 + vac * 0.2
    return D1Result(iva=round(iva, 4), bes=round(bes, 4), vac=round(vac, 4), score=round(score, 4))
```

- [ ] **Step 5: Verificar que los tests pasan**

```bash
PYTHONPATH=. pytest tests/kpi_engine/test_d1.py -v
```

Salida esperada:
```
tests/kpi_engine/test_d1.py::test_calcular_iva_con_ocupacion PASSED
tests/kpi_engine/test_d1.py::test_calcular_iva_sin_ocupaciones_retorna_default PASSED
tests/kpi_engine/test_d1.py::test_calcular_bes_con_overlap PASSED
tests/kpi_engine/test_d1.py::test_calcular_d1_score_en_rango PASSED
4 passed
```

- [ ] **Step 6: Commit**

```bash
git add pipeline/kpi_engine/ tests/kpi_engine/
git commit -m "feat(kpi): D1 Obsolescencia — IVA + BES + VAC + tests"
```

---

## Task 2: KPI Engine D2 — Oportunidades

**Files:**
- Create: `pipeline/kpi_engine/d2_oportunidades.py`
- Create: `tests/kpi_engine/test_d2.py`

- [ ] **Step 1: Crear `tests/kpi_engine/test_d2.py`**

```python
# tests/kpi_engine/test_d2.py
import json
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from pipeline.db.models import Base, Carrera, CarreraIES, Vacante
from pipeline.kpi_engine.d2_oportunidades import calcular_ioe, calcular_ihe, calcular_iea, calcular_d2


@pytest.fixture
def session():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    s = Session()
    yield s
    s.rollback()
    s.close()


def _cie(session, plan_skills=None, egresados=100, matricula=500):
    c = Carrera(nombre_norm=f"carrera_{id(plan_skills)}")
    session.add(c)
    session.flush()
    cie = CarreraIES(
        carrera_id=c.id,
        ciclo="2024/2",
        matricula=matricula,
        egresados=egresados,
        plan_estudio_skills=json.dumps(plan_skills or []),
    )
    session.add(cie)
    session.flush()
    return cie


def test_calcular_ioe_con_vacantes_emergentes(session):
    v1 = Vacante(titulo="ML Engineer", skills=json.dumps(["python", "machine learning"]), fuente="stps")
    v2 = Vacante(titulo="Contador", skills=json.dumps(["Excel", "Contabilidad"]), fuente="stps")
    session.add_all([v1, v2])
    session.flush()
    ioe = calcular_ioe(session)
    assert ioe == pytest.approx(0.5, abs=0.01)


def test_calcular_ihe_con_skills_emergentes(session):
    cie = _cie(session, plan_skills=["python", "machine learning", "Java"])
    ihe = calcular_ihe(cie)
    assert ihe > 0.0


def test_calcular_ihe_sin_skills_emergentes(session):
    cie = _cie(session, plan_skills=["Contabilidad", "Derecho"])
    ihe = calcular_ihe(cie)
    assert ihe == 0.0


def test_calcular_d2_score_en_rango(session):
    cie = _cie(session, plan_skills=["python", "cloud"])
    result = calcular_d2(cie, session)
    assert 0.0 <= result.score <= 1.0
    assert 0.0 <= result.ioe <= 1.0
    assert 0.0 <= result.ihe <= 1.0
    assert 0.0 <= result.iea <= 1.0
```

- [ ] **Step 2: Verificar que los tests fallan**

```bash
PYTHONPATH=. pytest tests/kpi_engine/test_d2.py -v 2>&1 | head -10
```

Salida esperada: `FAILED` con `ModuleNotFoundError`

- [ ] **Step 3: Crear `pipeline/kpi_engine/d2_oportunidades.py`**

```python
# pipeline/kpi_engine/d2_oportunidades.py
import json
import logging
from dataclasses import dataclass
from sqlalchemy.orm import Session
from pipeline.db.models import Vacante, CarreraIES

logger = logging.getLogger(__name__)

EMERGING_SKILLS = frozenset({
    "python", "machine learning", "inteligencia artificial", "ia", "cloud",
    "data science", "nlp", "deep learning", "llm", "big data", "tensorflow",
    "pytorch", "kubernetes", "docker", "mlops",
})


@dataclass
class D2Result:
    ioe: float
    ihe: float
    iea: float
    score: float


def calcular_ioe(session: Session) -> float:
    """Porcentaje de vacantes con al menos un skill emergente."""
    vacantes = session.query(Vacante).limit(500).all()
    if not vacantes:
        return 0.0
    count = sum(
        1 for v in vacantes
        if set(s.lower().strip() for s in _parse_skills(v.skills)) & EMERGING_SKILLS
    )
    return count / len(vacantes)


def calcular_ihe(carrera_ies: CarreraIES) -> float:
    """Overlap entre plan de estudios y skills emergentes conocidas."""
    plan = set(s.lower().strip() for s in _parse_skills(carrera_ies.plan_estudio_skills))
    if not plan:
        return 0.0
    return min(1.0, len(plan & EMERGING_SKILLS) / len(EMERGING_SKILLS))


def calcular_iea(carrera_ies: CarreraIES, session: Session) -> float:
    """Tasa egresados/matrícula ajustada por demanda de mercado."""
    matricula = max(1, carrera_ies.matricula or 1)
    egresados = max(0, carrera_ies.egresados or 0)
    tasa_egreso = min(1.0, egresados / matricula)
    n_vacantes = session.query(Vacante).count()
    factor_mercado = min(1.0, n_vacantes / max(1, egresados))
    return round(tasa_egreso * 0.6 + factor_mercado * 0.4, 4)


def calcular_d2(carrera_ies: CarreraIES, session: Session) -> D2Result:
    ioe = calcular_ioe(session)
    ihe = calcular_ihe(carrera_ies)
    iea = calcular_iea(carrera_ies, session)
    score = ioe * 0.4 + ihe * 0.35 + iea * 0.25
    return D2Result(ioe=round(ioe, 4), ihe=round(ihe, 4), iea=round(iea, 4), score=round(score, 4))


def _parse_skills(raw: str | None) -> list[str]:
    try:
        return json.loads(raw or "[]")
    except (json.JSONDecodeError, TypeError):
        return []
```

- [ ] **Step 4: Verificar que los tests pasan**

```bash
PYTHONPATH=. pytest tests/kpi_engine/test_d2.py -v
```

Salida esperada: `4 passed`

- [ ] **Step 5: Commit**

```bash
git add pipeline/kpi_engine/d2_oportunidades.py tests/kpi_engine/test_d2.py
git commit -m "feat(kpi): D2 Oportunidades — IOE + IHE + IEA + tests"
```

---

## Task 3: KPI Runner

**Files:**
- Create: `pipeline/kpi_engine/kpi_runner.py`
- Create: `tests/kpi_engine/test_kpi_runner.py`

- [ ] **Step 1: Crear `tests/kpi_engine/test_kpi_runner.py`**

```python
# tests/kpi_engine/test_kpi_runner.py
import json
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from pipeline.db.models import Base, Carrera, CarreraIES, Ocupacion
from pipeline.kpi_engine.kpi_runner import run_kpis


@pytest.fixture
def session():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    s = Session()
    yield s
    s.rollback()
    s.close()


def test_run_kpis_retorna_ambas_dimensiones(session):
    c = Carrera(nombre_norm="Ing. Sistemas", onet_codes_relacionados=json.dumps(["15-1252.00"]))
    session.add(c)
    occ = Ocupacion(onet_code="15-1252.00", nombre="Dev", p_automatizacion=0.30)
    session.add(occ)
    session.flush()
    cie = CarreraIES(carrera_id=c.id, ciclo="2024/2", matricula=400, egresados=80,
                     plan_estudio_skills=json.dumps(["Python", "SQL"]))
    session.add(cie)
    session.flush()
    result = run_kpis(c.id, session)
    assert result is not None
    assert 0.0 <= result.d1_obsolescencia.score <= 1.0
    assert 0.0 <= result.d2_oportunidades.score <= 1.0


def test_run_kpis_carrera_no_existe_retorna_none(session):
    result = run_kpis("id-inexistente", session)
    assert result is None
```

- [ ] **Step 2: Verificar que los tests fallan**

```bash
PYTHONPATH=. pytest tests/kpi_engine/test_kpi_runner.py -v 2>&1 | head -10
```

Salida esperada: `FAILED` con `ModuleNotFoundError`

- [ ] **Step 3: Crear `pipeline/kpi_engine/kpi_runner.py`**

```python
# pipeline/kpi_engine/kpi_runner.py
import logging
from dataclasses import dataclass
from sqlalchemy.orm import Session
from pipeline.db.models import Carrera, CarreraIES
from pipeline.kpi_engine.d1_obsolescencia import calcular_d1, D1Result
from pipeline.kpi_engine.d2_oportunidades import calcular_d2, D2Result

logger = logging.getLogger(__name__)


@dataclass
class KpiResult:
    carrera_id: str
    d1_obsolescencia: D1Result
    d2_oportunidades: D2Result


def run_kpis(carrera_id: str, session: Session) -> KpiResult | None:
    """Calcula D1+D2 para una carrera. Retorna None si no existe o sin datos de matrícula."""
    carrera = session.query(Carrera).filter_by(id=carrera_id).first()
    if not carrera:
        return None
    carrera_ies = session.query(CarreraIES).filter_by(carrera_id=carrera_id).first()
    if not carrera_ies:
        return None
    d1 = calcular_d1(carrera, carrera_ies, session)
    d2 = calcular_d2(carrera_ies, session)
    return KpiResult(carrera_id=carrera_id, d1_obsolescencia=d1, d2_oportunidades=d2)
```

- [ ] **Step 4: Verificar que los tests pasan**

```bash
PYTHONPATH=. pytest tests/kpi_engine/ -v
```

Salida esperada: `10 passed`

- [ ] **Step 5: Commit**

```bash
git add pipeline/kpi_engine/kpi_runner.py tests/kpi_engine/test_kpi_runner.py
git commit -m "feat(kpi): KpiRunner — orquesta D1+D2 por carrera_id"
```

---

## Task 4: FastAPI — Fundación + Endpoint Noticias

**Files:**
- Modify: `pipeline/requirements.txt` (añadir fastapi + uvicorn)
- Create: `api/__init__.py`
- Create: `api/main.py`
- Create: `api/deps.py`
- Create: `api/schemas.py`
- Create: `api/routers/__init__.py`
- Create: `api/routers/noticias.py`
- Create: `tests/api/__init__.py`
- Create: `tests/api/conftest.py`
- Create: `tests/api/test_noticias.py`

- [ ] **Step 1: Actualizar `pipeline/requirements.txt`**

Añadir al final del archivo:
```
fastapi==0.111.0
uvicorn[standard]==0.29.0
```

Instalar:
```bash
cd /Users/arturoaguilar/Documents/OIA-EE
source pipeline/.venv/bin/activate
pip install fastapi==0.111.0 "uvicorn[standard]==0.29.0" -q
echo "OK"
```

Salida esperada: `OK`

- [ ] **Step 2: Crear estructura de directorios**

```bash
mkdir -p api/routers tests/api
touch api/__init__.py api/routers/__init__.py tests/api/__init__.py
```

- [ ] **Step 3: Crear `tests/api/test_noticias.py`**

```python
# tests/api/test_noticias.py
from pipeline.db.models import Noticia


def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_list_noticias_vacio(client):
    resp = client.get("/noticias/")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_list_noticias_con_datos(client, db_session):
    n = Noticia(titulo="IA despide 1000", url="https://t.co/api1", fuente="rss", sector="tecnologia")
    db_session.add(n)
    db_session.flush()
    resp = client.get("/noticias/")
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


def test_get_noticia_not_found(client):
    resp = client.get("/noticias/id-inexistente")
    assert resp.status_code == 404


def test_filter_por_sector(client, db_session):
    n = Noticia(titulo="Salud IA", url="https://t.co/api-salud1", fuente="rss", sector="salud")
    db_session.add(n)
    db_session.flush()
    resp = client.get("/noticias/?sector=salud")
    assert resp.status_code == 200
    data = resp.json()
    assert any(item["sector"] == "salud" for item in data)
```

- [ ] **Step 4: Verificar que los tests fallan**

```bash
PYTHONPATH=. pytest tests/api/test_noticias.py -v 2>&1 | head -15
```

Salida esperada: `FAILED` con `ModuleNotFoundError`

- [ ] **Step 5: Crear `api/deps.py`**

```python
# api/deps.py
from pipeline.db import get_session


def get_db():
    """FastAPI dependency: yields a DB session."""
    with get_session() as session:
        yield session
```

- [ ] **Step 6: Crear `api/schemas.py`**

```python
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
```

- [ ] **Step 7: Crear `api/routers/noticias.py`**

```python
# api/routers/noticias.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from api.deps import get_db
from pipeline.db.models import Noticia
from api.schemas import NoticiaOut

router = APIRouter()


@router.get("/", response_model=list[NoticiaOut])
def list_noticias(
    skip: int = 0,
    limit: int = 20,
    sector: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(Noticia)
    if sector:
        q = q.filter(Noticia.sector == sector)
    return q.offset(skip).limit(limit).all()


@router.get("/{noticia_id}", response_model=NoticiaOut)
def get_noticia(noticia_id: str, db: Session = Depends(get_db)):
    noticia = db.query(Noticia).filter_by(id=noticia_id).first()
    if not noticia:
        raise HTTPException(status_code=404, detail="Noticia no encontrada")
    return noticia
```

- [ ] **Step 8: Crear `api/main.py`**

```python
# api/main.py
from fastapi import FastAPI
from api.routers import noticias, kpis

app = FastAPI(title="OIA-EE API", version="0.2.0")
app.include_router(noticias.router, prefix="/noticias", tags=["noticias"])
app.include_router(kpis.router, prefix="/kpis", tags=["kpis"])


@app.get("/health")
def health():
    return {"status": "ok"}
```

- [ ] **Step 9: Crear `api/routers/kpis.py` (stub — se completa en Task 5)**

```python
# api/routers/kpis.py
from fastapi import APIRouter

router = APIRouter()
```

- [ ] **Step 10: Crear `tests/api/conftest.py`**

```python
# tests/api/conftest.py
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from pipeline.db.models import Base
from api.main import app
from api.deps import get_db


@pytest.fixture(scope="session")
def test_engine():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    return engine


@pytest.fixture
def db_session(test_engine):
    Session = sessionmaker(bind=test_engine)
    session = Session()
    yield session
    session.rollback()
    session.close()


@pytest.fixture
def client(db_session):
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
```

- [ ] **Step 11: Verificar que los tests pasan**

```bash
PYTHONPATH=. pytest tests/api/test_noticias.py -v
```

Salida esperada: `5 passed`

- [ ] **Step 12: Commit**

```bash
git add api/ tests/api/ pipeline/requirements.txt
git commit -m "feat(api): FastAPI fundación + endpoint /noticias + tests"
```

---

## Task 5: FastAPI — Endpoint KPIs

**Files:**
- Modify: `api/routers/kpis.py` (implementación completa)
- Create: `tests/api/test_kpis.py`

- [ ] **Step 1: Crear `tests/api/test_kpis.py`**

```python
# tests/api/test_kpis.py
import json
from pipeline.db.models import Carrera, CarreraIES, Ocupacion


def test_get_kpis_carrera_not_found(client):
    resp = client.get("/kpis/carrera/id-no-existe")
    assert resp.status_code == 404


def test_get_kpis_carrera_ok(client, db_session):
    c = Carrera(nombre_norm="Ing. Cómputo KPI", onet_codes_relacionados=json.dumps(["15-1252.00"]))
    db_session.add(c)
    occ = Ocupacion(onet_code="15-1252.00", nombre="Dev", p_automatizacion=0.25)
    db_session.add(occ)
    db_session.flush()
    cie = CarreraIES(
        carrera_id=c.id, ciclo="2024/2", matricula=300, egresados=60,
        plan_estudio_skills=json.dumps(["Python"]),
    )
    db_session.add(cie)
    db_session.flush()
    resp = client.get(f"/kpis/carrera/{c.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert 0.0 <= data["d1_obsolescencia"]["score"] <= 1.0
    assert 0.0 <= data["d2_oportunidades"]["score"] <= 1.0


def test_kpis_estructura_completa(client, db_session):
    c = Carrera(nombre_norm="Administración Digital KPI")
    db_session.add(c)
    db_session.flush()
    cie = CarreraIES(carrera_id=c.id, ciclo="2024/2", matricula=200, egresados=40,
                     plan_estudio_skills=json.dumps([]))
    db_session.add(cie)
    db_session.flush()
    resp = client.get(f"/kpis/carrera/{c.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert set(data["d1_obsolescencia"].keys()) == {"iva", "bes", "vac", "score"}
    assert set(data["d2_oportunidades"].keys()) == {"ioe", "ihe", "iea", "score"}
```

- [ ] **Step 2: Verificar que los tests fallan**

```bash
PYTHONPATH=. pytest tests/api/test_kpis.py -v 2>&1 | head -15
```

Salida esperada: `FAILED` (404 o sin endpoint)

- [ ] **Step 3: Implementar `api/routers/kpis.py`**

```python
# api/routers/kpis.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from api.deps import get_db
from api.schemas import KpiOut, D1Out, D2Out
from pipeline.kpi_engine.kpi_runner import run_kpis

router = APIRouter()


@router.get("/carrera/{carrera_id}", response_model=KpiOut)
def get_kpis_carrera(carrera_id: str, db: Session = Depends(get_db)):
    result = run_kpis(carrera_id, db)
    if result is None:
        raise HTTPException(status_code=404, detail="Carrera no encontrada o sin datos de matrícula")
    return KpiOut(
        carrera_id=result.carrera_id,
        d1_obsolescencia=D1Out(**vars(result.d1_obsolescencia)),
        d2_oportunidades=D2Out(**vars(result.d2_oportunidades)),
    )
```

- [ ] **Step 4: Verificar que los tests pasan**

```bash
PYTHONPATH=. pytest tests/api/ -v
```

Salida esperada: `8 passed`

- [ ] **Step 5: Commit**

```bash
git add api/routers/kpis.py tests/api/test_kpis.py
git commit -m "feat(api): endpoint GET /kpis/carrera/{id} + tests"
```

---

## Task 6: Embeddings — Voyage AI + Búsqueda Semántica

**Files:**
- Create: `pipeline/utils/embeddings.py`
- Create: `tests/utils/test_embeddings.py`

- [ ] **Step 1: Crear `tests/utils/test_embeddings.py`**

```python
# tests/utils/test_embeddings.py
import json
import pytest
import respx
import httpx
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from pipeline.db.models import Base, Noticia
from pipeline.utils.embeddings import embed_text, store_embedding, search_similar

FAKE_VECTOR = [0.1] * 1024


@pytest.fixture
def session():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    s = Session()
    yield s
    s.rollback()
    s.close()


@respx.mock
def test_embed_text_retorna_vector():
    respx.post("https://api.voyageai.com/v1/embeddings").mock(
        return_value=httpx.Response(200, json={"data": [{"embedding": FAKE_VECTOR}]})
    )
    result = embed_text("despidos por IA en Meta", api_key="test-key")
    assert isinstance(result, list)
    assert len(result) == 1024


@respx.mock
def test_embed_text_retorna_none_en_error():
    respx.post("https://api.voyageai.com/v1/embeddings").mock(
        return_value=httpx.Response(500)
    )
    result = embed_text("texto", api_key="test-key")
    assert result is None


def test_store_embedding(session):
    n = Noticia(titulo="Test embed", url="https://t.co/emb1", fuente="rss")
    session.add(n)
    session.flush()
    ok = store_embedding(n.id, FAKE_VECTOR, session)
    assert ok is True
    assert json.loads(n.embedding_json) == FAKE_VECTOR


def test_search_similar_retorna_mas_cercano(session):
    n1 = Noticia(titulo="IA empleo", url="https://t.co/s1", fuente="rss",
                 embedding_json=json.dumps([1.0, 0.0] * 512))
    n2 = Noticia(titulo="Carrera universitaria", url="https://t.co/s2", fuente="rss",
                 embedding_json=json.dumps([0.0, 1.0] * 512))
    session.add_all([n1, n2])
    session.flush()
    results = search_similar([1.0, 0.0] * 512, session, top_k=1)
    assert len(results) == 1
    assert results[0].titulo == "IA empleo"
```

- [ ] **Step 2: Verificar que los tests fallan**

```bash
PYTHONPATH=. pytest tests/utils/test_embeddings.py -v 2>&1 | head -10
```

Salida esperada: `FAILED` con `ImportError`

- [ ] **Step 3: Crear `pipeline/utils/embeddings.py`**

```python
# pipeline/utils/embeddings.py
import json
import logging
import math
from typing import Optional
import httpx
from sqlalchemy.orm import Session
from pipeline.db.models import Noticia

logger = logging.getLogger(__name__)

VOYAGE_URL = "https://api.voyageai.com/v1/embeddings"


def embed_text(text: str, api_key: str, model: str = "voyage-3-lite") -> Optional[list[float]]:
    """Llama a Voyage AI para obtener embedding. Retorna None en error."""
    try:
        with httpx.Client(timeout=30) as client:
            resp = client.post(
                VOYAGE_URL,
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={"input": [text[:8000]], "model": model},
            )
            resp.raise_for_status()
            return resp.json()["data"][0]["embedding"]
    except Exception as e:
        logger.error("Embedding error: %s", e)
        return None


def store_embedding(noticia_id: str, vector: list[float], session: Session) -> bool:
    """Serializa el vector en Noticia.embedding_json. Retorna False si la noticia no existe."""
    noticia = session.query(Noticia).filter_by(id=noticia_id).first()
    if not noticia:
        return False
    noticia.embedding_json = json.dumps(vector)
    session.flush()
    return True


def search_similar(query_vector: list[float], session: Session, top_k: int = 5) -> list[Noticia]:
    """Busca noticias similares por cosine similarity sobre embedding_json (fallback Python)."""
    noticias = session.query(Noticia).filter(Noticia.embedding_json.isnot(None)).all()
    if not noticias:
        return []
    scored = []
    for n in noticias:
        try:
            vec = json.loads(n.embedding_json)
            scored.append((_cosine(query_vector, vec), n))
        except Exception:
            pass
    scored.sort(key=lambda x: x[0], reverse=True)
    return [n for _, n in scored[:top_k]]


def _cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    mag = math.sqrt(sum(x ** 2 for x in a)) * math.sqrt(sum(x ** 2 for x in b))
    return dot / mag if mag else 0.0
```

- [ ] **Step 4: Verificar que los tests pasan**

```bash
PYTHONPATH=. pytest tests/utils/test_embeddings.py -v
```

Salida esperada: `4 passed`

- [ ] **Step 5: Verificar suite completa Sprint 1 + Sprint 2**

```bash
PYTHONPATH=. pytest tests/ -q --tb=short
```

Salida esperada: `37 passed` (15 Sprint1 + 22 Sprint2), máximo 2 warnings de deprecación.

- [ ] **Step 6: Commit final de sprint**

```bash
git add pipeline/utils/embeddings.py tests/utils/test_embeddings.py pipeline/requirements.txt
git commit -m "feat(embeddings): Voyage AI embed_text + store + search_similar + tests"
git tag sprint2-kpi-api-embeddings
```

---

## Self-Review — Spec Coverage

| Requisito del spec | Cubierto | Task |
|---------------------|----------|------|
| KPI D1: IVA | ✅ | Task 1 |
| KPI D1: BES | ✅ | Task 1 |
| KPI D1: VAC | ✅ | Task 1 |
| KPI D2: IOE | ✅ | Task 2 |
| KPI D2: IHE | ✅ | Task 2 |
| KPI D2: IEA | ✅ | Task 2 |
| KPI Runner D1+D2 | ✅ | Task 3 |
| GET /health | ✅ | Task 4 |
| GET /noticias | ✅ | Task 4 |
| GET /noticias/{id} | ✅ | Task 4 |
| GET /kpis/carrera/{id} | ✅ | Task 5 |
| embed_text() Voyage AI | ✅ | Task 6 |
| store_embedding() | ✅ | Task 6 |
| search_similar() cosine | ✅ | Task 6 |
| GET /noticias/buscar | ⚠️ Stub — buscar endpoint omitido para mantener Sprint 2 enfocado; Sprint 3 |
| pgvector nativo | ⚠️ Sprint 3 — embedding_json (Text) usado en Sprint 2 |

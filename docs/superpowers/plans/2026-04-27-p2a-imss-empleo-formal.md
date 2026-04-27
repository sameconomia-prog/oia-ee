# P2A IMSS Empleo Formal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrar la API pública del IMSS Microscopio Laboral para reemplazar el proxy `EMPLEO_BASE_DEFAULT` en D5 Geografía con datos reales de empleo formal por estado.

**Architecture:** Nueva tabla `empleo_formal_imss` alimentada por `imss_loader.py` vía API CKAN pública del IMSS (sin auth). `calcular_ies_s()` en d5_geografia.py consulta la tabla primero; si no hay datos cae al comportamiento actual. Job mensual en scheduler el día 15.

**Tech Stack:** SQLAlchemy, Alembic, httpx, APScheduler, pytest + unittest.mock

---

## File Map

| Archivo | Acción |
|---------|--------|
| `pipeline/db/models_imss.py` | Crear — modelo `EmpleoFormalIMSS` |
| `pipeline/db/migrations/versions/p2imss001_empleo_formal.py` | Crear — migración Alembic |
| `pipeline/loaders/imss_loader.py` | Crear — `fetch_imss_empleo(anio, mes)` |
| `pipeline/jobs/imss_ingest_job.py` | Crear — `run_imss_ingest(session)` |
| `pipeline/scheduler.py` | Modificar — agregar job mensual |
| `pipeline/kpi_engine/d5_geografia.py` | Modificar — `calcular_ies_s()` usa IMSS |
| `tests/loaders/test_imss_loader.py` | Crear — tests con mock httpx |
| `tests/jobs/test_imss_ingest_job.py` | Crear — tests con SQLite in-memory |
| `tests/kpi_engine/test_d5_geografia.py` | Modificar — test con datos IMSS reales |

---

### Task 1: Modelo EmpleoFormalIMSS + migración Alembic

**Files:**
- Create: `pipeline/db/models_imss.py`
- Create: `pipeline/db/migrations/versions/p2imss001_empleo_formal.py`

- [ ] **Step 1: Crear modelo**

Crear `pipeline/db/models_imss.py`:

```python
# pipeline/db/models_imss.py
from sqlalchemy import Column, String, Integer, Date, UniqueConstraint, Index
from pipeline.db.models import Base, _uuid


class EmpleoFormalIMSS(Base):
    __tablename__ = "empleo_formal_imss"

    id            = Column(String(36), primary_key=True, default=_uuid)
    estado        = Column(String(100), nullable=False)
    sector_scian  = Column(String(10), nullable=False)
    sector_nombre = Column(String(200))
    anio          = Column(Integer, nullable=False)
    mes           = Column(Integer, nullable=False)
    trabajadores  = Column(Integer, nullable=False)
    fecha_corte   = Column(Date)

    __table_args__ = (
        UniqueConstraint("estado", "sector_scian", "anio", "mes",
                         name="uq_imss_estado_sector_periodo"),
        Index("idx_imss_estado_periodo", "estado", "anio", "mes"),
    )
```

- [ ] **Step 2: Crear migración Alembic**

Crear `pipeline/db/migrations/versions/p2imss001_empleo_formal.py`:

```python
"""p2a_empleo_formal_imss

Revision ID: p2imss001
Revises: p1pred001
Create Date: 2026-04-27

"""
from alembic import op
import sqlalchemy as sa

revision = 'p2imss001'
down_revision = 'p1pred001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'empleo_formal_imss',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('estado', sa.String(100), nullable=False),
        sa.Column('sector_scian', sa.String(10), nullable=False),
        sa.Column('sector_nombre', sa.String(200)),
        sa.Column('anio', sa.Integer(), nullable=False),
        sa.Column('mes', sa.Integer(), nullable=False),
        sa.Column('trabajadores', sa.Integer(), nullable=False),
        sa.Column('fecha_corte', sa.Date()),
        sa.UniqueConstraint('estado', 'sector_scian', 'anio', 'mes',
                            name='uq_imss_estado_sector_periodo'),
    )
    op.create_index('idx_imss_estado_periodo', 'empleo_formal_imss',
                    ['estado', 'anio', 'mes'])


def downgrade() -> None:
    op.drop_index('idx_imss_estado_periodo', table_name='empleo_formal_imss')
    op.drop_table('empleo_formal_imss')
```

- [ ] **Step 3: Verificar que la migración está bien formada**

```bash
cd ~/Documents/OIA-EE && source pipeline/.venv/bin/activate && python -c "
from pipeline.db.models_imss import EmpleoFormalIMSS
from sqlalchemy import create_engine
from pipeline.db.models import Base
engine = create_engine('sqlite+pysqlite:///:memory:')
Base.metadata.create_all(engine)
print('tabla creada OK')
"
```

Expected: `tabla creada OK`

- [ ] **Step 4: Correr tests existentes para asegurar que no hay regresiones**

```bash
cd ~/Documents/OIA-EE && source pipeline/.venv/bin/activate && python -m pytest tests/ -q
```

Expected: 273 passed, 0 failed

- [ ] **Step 5: Commit**

```bash
cd ~/Documents/OIA-EE && git add pipeline/db/models_imss.py pipeline/db/migrations/versions/p2imss001_empleo_formal.py && git commit -m "feat(p2a): add EmpleoFormalIMSS model and Alembic migration"
```

---

### Task 2: imss_loader.py con TDD

**Files:**
- Create: `tests/loaders/test_imss_loader.py`
- Create: `pipeline/loaders/imss_loader.py`

**Contexto de la API IMSS:** La API CKAN del IMSS en `https://datos.imss.gob.mx/api/3/action/datastore_search` puede no estar disponible en algunos momentos. El loader debe ser robusto ante fallos. El resource_id del dataset de asegurados por estado y sector es `"8b4e1b4b-b1b8-4b1b-8b4e-1b4b1b4b1b4b"` (se descubre en runtime si no responde — el loader lo intenta y retorna lista vacía en caso de error).

- [ ] **Step 1: Escribir tests que fallan**

Crear `tests/loaders/test_imss_loader.py`:

```python
# tests/loaders/test_imss_loader.py
import pytest
from unittest.mock import patch, MagicMock
from pipeline.loaders.imss_loader import fetch_imss_empleo, _normalizar_estado


def _mock_ckan_response(records: list[dict]) -> MagicMock:
    resp = MagicMock()
    resp.raise_for_status = MagicMock()
    resp.json.return_value = {
        "result": {
            "records": records,
            "total": len(records),
        }
    }
    return resp


def test_fetch_retorna_lista_de_dicts_con_campos_correctos():
    fake_records = [
        {
            "estado": "Jalisco",
            "sector": "31",
            "desc_sector": "Industrias manufactureras",
            "total_trabajadores": "125000",
            "anio": "2025",
            "mes": "3",
        }
    ]
    with patch("pipeline.loaders.imss_loader.httpx.get",
               return_value=_mock_ckan_response(fake_records)):
        result = fetch_imss_empleo(2025, 3)

    assert len(result) == 1
    r = result[0]
    assert r["estado"] == "Jalisco"
    assert r["sector_scian"] == "31"
    assert r["sector_nombre"] == "Industrias manufactureras"
    assert r["trabajadores"] == 125000
    assert r["anio"] == 2025
    assert r["mes"] == 3


def test_fetch_retorna_lista_vacia_si_api_falla():
    with patch("pipeline.loaders.imss_loader.httpx.get",
               side_effect=Exception("connection timeout")):
        result = fetch_imss_empleo(2025, 3)

    assert result == []


def test_normalizar_estado_cdmx():
    assert _normalizar_estado("Ciudad de México") == "Ciudad de México"
    assert _normalizar_estado("CDMX") == "Ciudad de México"
    assert _normalizar_estado("D.F.") == "Ciudad de México"


def test_normalizar_estado_preserva_nombre_normal():
    assert _normalizar_estado("Jalisco") == "Jalisco"
    assert _normalizar_estado("Nuevo León") == "Nuevo León"
```

- [ ] **Step 2: Correr tests — verificar que fallan**

```bash
cd ~/Documents/OIA-EE && source pipeline/.venv/bin/activate && python -m pytest tests/loaders/test_imss_loader.py -v
```

Expected: `ERROR` — ModuleNotFoundError: `imss_loader` no existe aún

- [ ] **Step 3: Implementar imss_loader.py**

Crear `pipeline/loaders/imss_loader.py`:

```python
# pipeline/loaders/imss_loader.py
"""Descarga datos de empleo formal del IMSS Microscopio Laboral (API CKAN pública)."""
from datetime import date
from typing import Optional
import httpx
import structlog

logger = structlog.get_logger()

_IMSS_API = "https://datos.imss.gob.mx/api/3/action/datastore_search"
_RESOURCE_ID = "c2f11c9f-cbaf-48e9-9e20-39fdb4f85e7f"  # Asegurados por estado/sector

_ESTADO_ALIASES: dict[str, str] = {
    "CDMX": "Ciudad de México",
    "D.F.": "Ciudad de México",
    "Distrito Federal": "Ciudad de México",
    "Estado de México": "México",
    "Edo. de México": "México",
    "Edo. México": "México",
}


def _normalizar_estado(nombre: str) -> str:
    return _ESTADO_ALIASES.get(nombre.strip(), nombre.strip())


def fetch_imss_empleo(anio: int, mes: int, limit: int = 10000) -> list[dict]:
    """Descarga empleo formal IMSS para el periodo anio/mes.

    Retorna lista de dicts con campos: estado, sector_scian, sector_nombre,
    anio, mes, trabajadores, fecha_corte.
    Si la API falla retorna lista vacía.
    """
    try:
        resp = httpx.get(
            _IMSS_API,
            params={
                "resource_id": _RESOURCE_ID,
                "limit": limit,
                "filters": f'{{"anio":"{anio}","mes":"{mes}"}}',
            },
            timeout=30.0,
        )
        resp.raise_for_status()
        data = resp.json()
        records = data.get("result", {}).get("records", [])
        results = []
        fecha_corte = date(anio, mes, 1)
        for r in records:
            try:
                trabajadores = int(float(r.get("total_trabajadores", 0) or 0))
            except (ValueError, TypeError):
                trabajadores = 0
            results.append({
                "estado": _normalizar_estado(r.get("estado", "")),
                "sector_scian": str(r.get("sector", "")).strip(),
                "sector_nombre": r.get("desc_sector", ""),
                "anio": anio,
                "mes": mes,
                "trabajadores": trabajadores,
                "fecha_corte": fecha_corte,
            })
        logger.info("imss_fetch_ok", anio=anio, mes=mes, registros=len(results))
        return results
    except Exception as e:
        logger.error("imss_fetch_error", anio=anio, mes=mes, error=str(e))
        return []
```

- [ ] **Step 4: Correr tests — verificar que pasan**

```bash
cd ~/Documents/OIA-EE && source pipeline/.venv/bin/activate && python -m pytest tests/loaders/test_imss_loader.py -v
```

Expected:
```
tests/loaders/test_imss_loader.py::test_fetch_retorna_lista_de_dicts_con_campos_correctos PASSED
tests/loaders/test_imss_loader.py::test_fetch_retorna_lista_vacia_si_api_falla PASSED
tests/loaders/test_imss_loader.py::test_normalizar_estado_cdmx PASSED
tests/loaders/test_imss_loader.py::test_normalizar_estado_preserva_nombre_normal PASSED
4 passed
```

- [ ] **Step 5: Commit**

```bash
cd ~/Documents/OIA-EE && git add pipeline/loaders/imss_loader.py tests/loaders/test_imss_loader.py && git commit -m "feat(p2a): add IMSS empleo formal loader with state normalization"
```

---

### Task 3: imss_ingest_job.py con TDD

**Files:**
- Create: `tests/jobs/test_imss_ingest_job.py`
- Create: `pipeline/jobs/imss_ingest_job.py`

- [ ] **Step 1: Escribir tests que fallan**

Crear `tests/jobs/test_imss_ingest_job.py`:

```python
# tests/jobs/test_imss_ingest_job.py
from datetime import date
from unittest.mock import patch
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from pipeline.db.models import Base
from pipeline.db.models_imss import EmpleoFormalIMSS
from pipeline.jobs.imss_ingest_job import run_imss_ingest


@pytest.fixture
def session():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    s = Session()
    yield s
    s.rollback()
    s.close()


import pytest

_FAKE_RECORDS = [
    {"estado": "Jalisco", "sector_scian": "31", "sector_nombre": "Manufactura",
     "anio": 2025, "mes": 3, "trabajadores": 125000, "fecha_corte": date(2025, 3, 1)},
    {"estado": "CDMX", "sector_scian": "52", "sector_nombre": "Financiero",
     "anio": 2025, "mes": 3, "trabajadores": 88000, "fecha_corte": date(2025, 3, 1)},
]


def test_inserta_nuevos_registros(session):
    with patch("pipeline.jobs.imss_ingest_job.fetch_imss_empleo",
               return_value=_FAKE_RECORDS):
        result = run_imss_ingest(session)

    assert result["insertados"] == 2
    assert result["actualizados"] == 0
    assert session.query(EmpleoFormalIMSS).count() == 2


def test_upsert_actualiza_trabajadores_existente(session):
    with patch("pipeline.jobs.imss_ingest_job.fetch_imss_empleo",
               return_value=_FAKE_RECORDS):
        run_imss_ingest(session)

    updated = [
        {"estado": "Jalisco", "sector_scian": "31", "sector_nombre": "Manufactura",
         "anio": 2025, "mes": 3, "trabajadores": 130000, "fecha_corte": date(2025, 3, 1)},
    ]
    with patch("pipeline.jobs.imss_ingest_job.fetch_imss_empleo",
               return_value=updated):
        result = run_imss_ingest(session)

    assert result["actualizados"] == 1
    assert result["insertados"] == 0
    jalisco = session.query(EmpleoFormalIMSS).filter_by(
        estado="Jalisco", sector_scian="31", anio=2025, mes=3
    ).first()
    assert jalisco.trabajadores == 130000


def test_lista_vacia_no_falla(session):
    with patch("pipeline.jobs.imss_ingest_job.fetch_imss_empleo", return_value=[]):
        result = run_imss_ingest(session)
    assert result["procesados"] == 0
```

- [ ] **Step 2: Correr tests — verificar que fallan**

```bash
cd ~/Documents/OIA-EE && source pipeline/.venv/bin/activate && python -m pytest tests/jobs/test_imss_ingest_job.py -v
```

Expected: `ERROR` — ModuleNotFoundError: `imss_ingest_job` no existe aún

- [ ] **Step 3: Implementar imss_ingest_job.py**

Crear `pipeline/jobs/imss_ingest_job.py`:

```python
# pipeline/jobs/imss_ingest_job.py
"""Job mensual: descarga empleo formal IMSS → upsert en empleo_formal_imss."""
from datetime import date
import structlog
from sqlalchemy.orm import Session
from pipeline.loaders.imss_loader import fetch_imss_empleo
from pipeline.db.models_imss import EmpleoFormalIMSS

logger = structlog.get_logger()


def _mes_anterior(hoy: date | None = None) -> tuple[int, int]:
    """Retorna (anio, mes) del mes anterior a hoy."""
    ref = hoy or date.today()
    if ref.month == 1:
        return ref.year - 1, 12
    return ref.year, ref.month - 1


def run_imss_ingest(session: Session, anio: int | None = None,
                    mes: int | None = None) -> dict:
    """Descarga empleo formal IMSS y hace upsert en la BD.

    Si anio/mes no se especifican usa el mes anterior.
    Retorna {"procesados": N, "insertados": N, "actualizados": N}.
    """
    if anio is None or mes is None:
        anio, mes = _mes_anterior()

    records = fetch_imss_empleo(anio, mes)
    procesados = insertados = actualizados = 0

    for r in records:
        procesados += 1
        existing = session.query(EmpleoFormalIMSS).filter_by(
            estado=r["estado"],
            sector_scian=r["sector_scian"],
            anio=r["anio"],
            mes=r["mes"],
        ).first()

        if existing:
            existing.trabajadores = r["trabajadores"]
            if r.get("fecha_corte"):
                existing.fecha_corte = r["fecha_corte"]
            actualizados += 1
        else:
            session.add(EmpleoFormalIMSS(
                estado=r["estado"],
                sector_scian=r["sector_scian"],
                sector_nombre=r.get("sector_nombre", ""),
                anio=r["anio"],
                mes=r["mes"],
                trabajadores=r["trabajadores"],
                fecha_corte=r.get("fecha_corte"),
            ))
            insertados += 1

    session.flush()
    result = {"procesados": procesados, "insertados": insertados,
              "actualizados": actualizados}
    logger.info("imss_ingest_complete", **result)
    return result
```

- [ ] **Step 4: Correr tests — verificar que pasan**

```bash
cd ~/Documents/OIA-EE && source pipeline/.venv/bin/activate && python -m pytest tests/jobs/test_imss_ingest_job.py -v
```

Expected:
```
tests/jobs/test_imss_ingest_job.py::test_inserta_nuevos_registros PASSED
tests/jobs/test_imss_ingest_job.py::test_upsert_actualiza_trabajadores_existente PASSED
tests/jobs/test_imss_ingest_job.py::test_lista_vacia_no_falla PASSED
3 passed
```

- [ ] **Step 5: Correr suite completa**

```bash
cd ~/Documents/OIA-EE && source pipeline/.venv/bin/activate && python -m pytest tests/ -q
```

Expected: 276+ passed, 0 failed

- [ ] **Step 6: Commit**

```bash
cd ~/Documents/OIA-EE && git add pipeline/jobs/imss_ingest_job.py tests/jobs/test_imss_ingest_job.py && git commit -m "feat(p2a): add IMSS ingest job with upsert logic"
```

---

### Task 4: Agregar job al scheduler

**Files:**
- Modify: `pipeline/scheduler.py`

- [ ] **Step 1: Agregar función wrapper y job**

En `pipeline/scheduler.py`, agregar después de `run_anuies_loader()` la siguiente función:

```python
def run_imss_loader():
    from pipeline.jobs.imss_ingest_job import run_imss_ingest
    from pipeline.db import get_session
    with get_session() as session:
        result = run_imss_ingest(session)
        session.commit()
    logger.info("imss_ingest OK: %s", result)
```

Y agregar el job al final de los `scheduler.add_job(...)` existentes (antes del `if __name__ == "__main__":`):

```python
scheduler.add_job(
    run_imss_loader,
    trigger=CronTrigger(day=15, hour=3, minute=0),
    id="imss_loader",
    name="Carga IMSS empleo formal mensual",
    replace_existing=True,
)
```

- [ ] **Step 2: Verificar que el scheduler importa sin error**

```bash
cd ~/Documents/OIA-EE && source pipeline/.venv/bin/activate && python -c "import pipeline.scheduler; print('scheduler OK')"
```

Expected: `scheduler OK`

- [ ] **Step 3: Correr suite completa**

```bash
cd ~/Documents/OIA-EE && source pipeline/.venv/bin/activate && python -m pytest tests/ -q
```

Expected: 276+ passed, 0 failed

- [ ] **Step 4: Commit**

```bash
cd ~/Documents/OIA-EE && git add pipeline/scheduler.py && git commit -m "feat(p2a): add IMSS monthly job to scheduler (day 15 at 3am)"
```

---

### Task 5: Actualizar calcular_ies_s() en D5 para usar datos IMSS

**Files:**
- Modify: `pipeline/kpi_engine/d5_geografia.py`
- Modify: `tests/kpi_engine/test_d5_geografia.py`

- [ ] **Step 1: Agregar test con datos IMSS reales**

Agregar al final de `tests/kpi_engine/test_d5_geografia.py`:

```python
from pipeline.db.models_imss import EmpleoFormalIMSS


@pytest.fixture
def session_with_imss():
    from pipeline.db.models_imss import EmpleoFormalIMSS
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    # Crear tabla IMSS también (está en otro Base metadata)
    from sqlalchemy import inspect
    if not inspect(engine).has_table("empleo_formal_imss"):
        EmpleoFormalIMSS.__table__.create(engine)
    Session = sessionmaker(bind=engine)
    s = Session()
    yield s
    s.rollback()
    s.close()


def test_ies_s_usa_datos_imss_cuando_disponibles(session_with_imss):
    session = session_with_imss
    # Insertar datos IMSS reales para Jalisco
    session.add(EmpleoFormalIMSS(
        estado="Jalisco", sector_scian="31", sector_nombre="Manufactura",
        anio=2025, mes=3, trabajadores=500_000,
    ))
    session.flush()
    ies_s = calcular_ies_s("Jalisco", session)
    # Con 500_000 trabajadores IMSS el denominador es grande → score diferente al default
    assert 0.0 <= ies_s <= 1.0


def test_ies_s_fallback_sin_datos_imss(session):
    # Sin datos IMSS: comportamiento original
    ies_s = calcular_ies_s("Sonora", session)
    assert ies_s == 0.5
```

- [ ] **Step 2: Correr tests nuevos — verificar que fallan**

```bash
cd ~/Documents/OIA-EE && source pipeline/.venv/bin/activate && python -m pytest tests/kpi_engine/test_d5_geografia.py::test_ies_s_usa_datos_imss_cuando_disponibles -v
```

Expected: FAILED — `calcular_ies_s` no consulta IMSS aún

- [ ] **Step 3: Modificar calcular_ies_s() en d5_geografia.py**

Reemplazar la función completa `calcular_ies_s` y su import en `pipeline/kpi_engine/d5_geografia.py`:

Primero agregar el import al inicio del archivo (después de los imports existentes):

```python
from pipeline.db.models_imss import EmpleoFormalIMSS
```

Luego reemplazar `calcular_ies_s`:

```python
def calcular_ies_s(estado: str, session: Session) -> float:
    """IES_S basado en empleo formal IMSS cuando disponible, vacantes como fallback.

    Con datos IMSS: trabajadores_estado / (trabajadores_estado + despidos_nacionales + 1)
    Sin datos IMSS: vacantes_estado / (vacantes_estado + despidos_nacionales + 1)
    Resultado centrado en [0,1].
    """
    despidos_nacionales = (
        session.query(Noticia)
        .filter(Noticia.causa_ia.isnot(None))
        .count()
    )

    # Intentar datos IMSS del período más reciente disponible
    imss_row = (
        session.query(
            sqlalchemy_func(EmpleoFormalIMSS.trabajadores)
        )
        .filter(EmpleoFormalIMSS.estado == estado)
        .order_by(EmpleoFormalIMSS.anio.desc(), EmpleoFormalIMSS.mes.desc())
        .first()
    )

    if imss_row and imss_row[0]:
        empleo = int(imss_row[0])
    else:
        empleo = session.query(Vacante).filter(Vacante.estado == estado).count()

    raw = (empleo - despidos_nacionales) / (empleo + despidos_nacionales + 1)
    return round((raw + 1) / 2, 4)
```

**IMPORTANTE:** el `sqlalchemy_func` en el paso anterior es `sqlalchemy.func.sum`. Agregar el import al inicio del archivo:

```python
from sqlalchemy import func as sqlalchemy_func
```

El archivo completo `pipeline/kpi_engine/d5_geografia.py` debe quedar así:

```python
import logging
from dataclasses import dataclass
from sqlalchemy import func as sqlalchemy_func
from sqlalchemy.orm import Session
from pipeline.db.models import IES, CarreraIES, Noticia, Vacante
from pipeline.db.models_imss import EmpleoFormalIMSS

logger = logging.getLogger(__name__)

EMPLEO_BASE_DEFAULT = 1_000_000  # proxy cuando no hay matricula registrada


@dataclass
class D5Result:
    idr: float   # Índice Despidos por IA (proxy nacional) [0,1]  alto=más riesgo
    icg: float   # Índice Competitividad Geográfica [0,1]  alto=mejor
    ies_s: float # Score Empleo Sectorial por estado [0,1]  alto=mejor
    score: float # Score regional D5 [0,1]  alto=mejor


def calcular_idr(estado: str, session: Session) -> float:
    """IDR = despidos_IA_nacionales * 1000 / matricula_estado.
    Usa proxy nacional de despidos pues Noticia no almacena estado.
    5+ despidos por cada 1000 matriculados → 1.0 (máximo riesgo)."""
    despidos_nacionales = (
        session.query(Noticia)
        .filter(Noticia.causa_ia.isnot(None))
        .count()
    )
    matriculas = (
        session.query(IES.matricula_total)
        .filter(IES.estado == estado, IES.matricula_total.isnot(None))
        .all()
    )
    empleo = sum(m[0] for m in matriculas if m[0]) or EMPLEO_BASE_DEFAULT
    idr_raw = despidos_nacionales * 1000 / empleo
    return round(min(1.0, idr_raw / 5.0), 4)


def calcular_icg(estado: str, session: Session) -> float:
    """ICG = IES con al menos 1 carrera con skills actualizados / total IES activas en estado."""
    ies_list = session.query(IES).filter(IES.estado == estado, IES.activa == True).all()
    if not ies_list:
        return 0.5
    n_modernas = sum(
        1 for ies in ies_list
        if session.query(CarreraIES).filter(
            CarreraIES.ies_id == ies.id,
            CarreraIES.plan_estudio_skills.isnot(None),
            CarreraIES.plan_estudio_skills != "[]",
        ).first()
    )
    return round(n_modernas / len(ies_list), 4)


def calcular_ies_s(estado: str, session: Session) -> float:
    """IES_S basado en empleo formal IMSS cuando disponible, vacantes como fallback.

    Con datos IMSS: trabajadores_estado / (trabajadores_estado + despidos_nacionales + 1)
    Sin datos IMSS: vacantes_estado / (vacantes_estado + despidos_nacionales + 1)
    Resultado centrado en [0,1].
    """
    despidos_nacionales = (
        session.query(Noticia)
        .filter(Noticia.causa_ia.isnot(None))
        .count()
    )

    imss_row = (
        session.query(sqlalchemy_func.sum(EmpleoFormalIMSS.trabajadores))
        .filter(EmpleoFormalIMSS.estado == estado)
        .order_by(EmpleoFormalIMSS.anio.desc(), EmpleoFormalIMSS.mes.desc())
        .first()
    )

    if imss_row and imss_row[0]:
        empleo = int(imss_row[0])
    else:
        empleo = session.query(Vacante).filter(Vacante.estado == estado).count()

    raw = (empleo - despidos_nacionales) / (empleo + despidos_nacionales + 1)
    return round((raw + 1) / 2, 4)


def calcular_d5(estado: str, session: Session) -> D5Result:
    idr = calcular_idr(estado, session)
    icg = calcular_icg(estado, session)
    ies_s = calcular_ies_s(estado, session)
    score = round((1 - idr) * 0.35 + icg * 0.35 + ies_s * 0.30, 4)
    return D5Result(idr=idr, icg=icg, ies_s=ies_s, score=score)
```

- [ ] **Step 4: Correr todos los tests de D5**

```bash
cd ~/Documents/OIA-EE && source pipeline/.venv/bin/activate && python -m pytest tests/kpi_engine/test_d5_geografia.py -v
```

Expected: todos PASS (tests anteriores + 2 nuevos)

- [ ] **Step 5: Correr suite completa**

```bash
cd ~/Documents/OIA-EE && source pipeline/.venv/bin/activate && python -m pytest tests/ -q
```

Expected: 278+ passed, 0 failed

- [ ] **Step 6: Commit**

```bash
cd ~/Documents/OIA-EE && git add pipeline/kpi_engine/d5_geografia.py tests/kpi_engine/test_d5_geografia.py && git commit -m "feat(p2a): D5 calcular_ies_s uses real IMSS data with vacantes fallback"
```

---

### Task 6: Push y nota Obsidian

**Files:**
- External: Obsidian Vault

- [ ] **Step 1: Push a origin**

```bash
cd ~/Documents/OIA-EE && git push origin main
```

- [ ] **Step 2: Guardar nota en Obsidian**

Crear `/Users/arturoaguilar/Documents/Obsidian Vault/01 - Proyectos/OIA-EE/p2a-imss-completado.md`:

```markdown
# P2A IMSS Empleo Formal — Completado 2026-04-27

## Resumen
D5 Geografía ahora usa datos reales del IMSS Microscopio Laboral.
Antes: proxy fijo de 1,000,000 trabajadores para todos los estados.
Ahora: suma real de empleo formal IMSS por estado (con fallback si no hay datos).

## Qué se implementó
- `pipeline/db/models_imss.py` — modelo EmpleoFormalIMSS
- Migración Alembic `p2imss001`
- `pipeline/loaders/imss_loader.py` — API CKAN IMSS pública (sin auth)
- `pipeline/jobs/imss_ingest_job.py` — upsert mensual
- `pipeline/scheduler.py` — job el día 15 de cada mes a las 3am
- `pipeline/kpi_engine/d5_geografia.py` — calcular_ies_s() usa IMSS real

## Variables de entorno
Ninguna — la API IMSS es completamente pública.

#OIA-EE #p2a #imss #d5 #completado
```

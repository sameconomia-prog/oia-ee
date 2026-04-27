# P2B INEGI ENOE Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrar la API BIE del INEGI (ENOE) para enriquecer D5 Geografía con empleo total (formal+informal) y D3 Mercado con un factor macro de desempleo nacional.

**Architecture:** Nueva tabla `indicador_enoe` alimentada por `enoe_loader.py` vía API BIE INEGI (token gratuito). `calcular_ies_s()` usa `poblacion_ocupada` ENOE primero (fallback IMSS → Vacante). `calcular_tdm()` en D3 multiplica por `calcular_factor_macro()` que lee `tasa_desempleo` nacional ENOE. Job trimestral el día 20 de enero, abril, julio y octubre.

**Tech Stack:** SQLAlchemy, Alembic, httpx, APScheduler CronTrigger, pytest + unittest.mock

---

## File Map

| Archivo | Acción |
|---------|--------|
| `pipeline/db/models_enoe.py` | Crear — modelo `IndicadorENOE` |
| `pipeline/db/migrations/versions/p2enoe001_indicadores_enoe.py` | Crear — migración Alembic (down_revision: p2imss001) |
| `pipeline/loaders/enoe_loader.py` | Crear — `fetch_enoe_indicadores()` + `_fetch_serie()` |
| `pipeline/jobs/enoe_ingest_job.py` | Crear — `run_enoe_ingest()` upsert trimestral |
| `pipeline/scheduler.py` | Modificar — agregar job trimestral |
| `pipeline/kpi_engine/d5_geografia.py` | Modificar — `calcular_ies_s()` usa ENOE primero |
| `pipeline/kpi_engine/d3_mercado.py` | Modificar — `calcular_factor_macro()` + modificar `calcular_tdm()` |
| `tests/loaders/test_enoe_loader.py` | Crear — mock httpx |
| `tests/jobs/test_enoe_ingest_job.py` | Crear — SQLite in-memory |
| `tests/kpi_engine/test_d5_geografia.py` | Modificar — prioridad ENOE>IMSS>fallback |
| `tests/kpi_engine/test_d3.py` | Modificar — factor_macro + TDM amplificado |

---

### Task 1: Modelo IndicadorENOE + migración Alembic

**Files:**
- Create: `pipeline/db/models_enoe.py`
- Create: `pipeline/db/migrations/versions/p2enoe001_indicadores_enoe.py`

- [ ] **Step 1: Crear modelo**

Crear `pipeline/db/models_enoe.py`:

```python
# pipeline/db/models_enoe.py
from sqlalchemy import Column, String, Integer, Float, Date, UniqueConstraint, Index
from pipeline.db.models import Base, _uuid


class IndicadorENOE(Base):
    __tablename__ = "indicador_enoe"

    id               = Column(String(36), primary_key=True, default=_uuid)
    estado           = Column(String(100), nullable=False)
    anio             = Column(Integer, nullable=False)
    trimestre        = Column(Integer, nullable=False)
    tasa_desempleo   = Column(Float)
    poblacion_ocupada = Column(Integer)
    fecha_corte      = Column(Date)

    __table_args__ = (
        UniqueConstraint("estado", "anio", "trimestre",
                         name="uq_enoe_estado_periodo"),
        Index("idx_enoe_estado_periodo", "estado", "anio", "trimestre"),
    )
```

- [ ] **Step 2: Crear migración Alembic**

Crear `pipeline/db/migrations/versions/p2enoe001_indicadores_enoe.py`:

```python
"""p2b_indicadores_enoe

Revision ID: p2enoe001
Revises: p2imss001
Create Date: 2026-04-27

"""
from alembic import op
import sqlalchemy as sa

revision = 'p2enoe001'
down_revision = 'p2imss001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'indicador_enoe',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('estado', sa.String(100), nullable=False),
        sa.Column('anio', sa.Integer(), nullable=False),
        sa.Column('trimestre', sa.Integer(), nullable=False),
        sa.Column('tasa_desempleo', sa.Float()),
        sa.Column('poblacion_ocupada', sa.Integer()),
        sa.Column('fecha_corte', sa.Date()),
        sa.UniqueConstraint('estado', 'anio', 'trimestre',
                            name='uq_enoe_estado_periodo'),
    )
    op.create_index('idx_enoe_estado_periodo', 'indicador_enoe',
                    ['estado', 'anio', 'trimestre'])


def downgrade() -> None:
    op.drop_index('idx_enoe_estado_periodo', table_name='indicador_enoe')
    op.drop_table('indicador_enoe')
```

- [ ] **Step 3: Verificar tabla en SQLite in-memory**

```bash
cd ~/Documents/OIA-EE && source pipeline/.venv/bin/activate && python -c "
from pipeline.db.models_enoe import IndicadorENOE
from pipeline.db.models import Base
from sqlalchemy import create_engine
engine = create_engine('sqlite+pysqlite:///:memory:')
Base.metadata.create_all(engine)
print('tabla creada OK')
"
```

Expected: `tabla creada OK`

- [ ] **Step 4: Correr suite existente**

```bash
cd ~/Documents/OIA-EE && source pipeline/.venv/bin/activate && python -m pytest tests/ -q
```

Expected: 282 passed, 0 failed

- [ ] **Step 5: Commit**

```bash
cd ~/Documents/OIA-EE && git add pipeline/db/models_enoe.py pipeline/db/migrations/versions/p2enoe001_indicadores_enoe.py && git commit -m "feat(p2b): add IndicadorENOE model and Alembic migration"
```

---

### Task 2: enoe_loader.py con TDD

**Files:**
- Create: `tests/loaders/test_enoe_loader.py`
- Create: `pipeline/loaders/enoe_loader.py`

- [ ] **Step 1: Escribir tests que fallan**

Crear `tests/loaders/test_enoe_loader.py`:

```python
# tests/loaders/test_enoe_loader.py
import pytest
from unittest.mock import patch
from pipeline.loaders.enoe_loader import fetch_enoe_indicadores, _SERIE_TDA, _SERIE_POB


def test_fetch_retorna_lista_con_campos_correctos():
    def mock_fetch(serie, geo, anio, trim, token):
        return 3.5 if serie == _SERIE_TDA else 2500.0

    with patch("pipeline.loaders.enoe_loader._fetch_serie", side_effect=mock_fetch):
        result = fetch_enoe_indicadores(2025, 1, "fake-token")

    assert len(result) == 33  # Nacional + 32 estados
    nacional = next(r for r in result if r["estado"] == "Nacional")
    assert nacional["tasa_desempleo"] == pytest.approx(3.5)
    assert nacional["poblacion_ocupada"] == 2500
    assert nacional["anio"] == 2025
    assert nacional["trimestre"] == 1


def test_fetch_retorna_lista_vacia_si_token_ausente():
    result = fetch_enoe_indicadores(2025, 1, "")
    assert result == []


def test_fetch_retorna_lista_vacia_si_api_falla_en_todos():
    with patch("pipeline.loaders.enoe_loader._fetch_serie", return_value=None):
        result = fetch_enoe_indicadores(2025, 1, "fake-token")
    assert result == []
```

- [ ] **Step 2: Correr tests — verificar que fallan**

```bash
cd ~/Documents/OIA-EE && source pipeline/.venv/bin/activate && python -m pytest tests/loaders/test_enoe_loader.py -v
```

Expected: ERROR — ModuleNotFoundError: `enoe_loader` no existe aún

- [ ] **Step 3: Implementar enoe_loader.py**

Crear `pipeline/loaders/enoe_loader.py`:

```python
# pipeline/loaders/enoe_loader.py
"""Descarga indicadores ENOE del INEGI vía API BIE (token gratuito)."""
from datetime import date
import httpx
import structlog

logger = structlog.get_logger()

_INEGI_API = "https://www.inegi.org.mx/app/api/indicadores/desarrolladores/jsonxml/INDICATOR"
# Series BIE ENOE (verificar en https://www.inegi.org.mx/app/biinegi/)
_SERIE_TDA = "6200093677"   # Tasa de desocupación abierta (%) — trimestral
_SERIE_POB = "6200093696"   # Población ocupada total (miles de personas) — trimestral

# Códigos de área geográfica BIE: 070000=Nacional, 070001=Ags ... 070032=Zac
_GEOGRAFIAS: dict[str, str] = {
    "Nacional":             "070000",
    "Aguascalientes":       "070001",
    "Baja California":      "070002",
    "Baja California Sur":  "070003",
    "Campeche":             "070004",
    "Coahuila":             "070005",
    "Colima":               "070006",
    "Chiapas":              "070007",
    "Chihuahua":            "070008",
    "Ciudad de México":     "070009",
    "Durango":              "070010",
    "Guanajuato":           "070011",
    "Guerrero":             "070012",
    "Hidalgo":              "070013",
    "Jalisco":              "070014",
    "México":               "070015",
    "Michoacán":            "070016",
    "Morelos":              "070017",
    "Nayarit":              "070018",
    "Nuevo León":           "070019",
    "Oaxaca":               "070020",
    "Puebla":               "070021",
    "Querétaro":            "070022",
    "Quintana Roo":         "070023",
    "San Luis Potosí":      "070024",
    "Sinaloa":              "070025",
    "Sonora":               "070026",
    "Tabasco":              "070027",
    "Tamaulipas":           "070028",
    "Tlaxcala":             "070029",
    "Veracruz":             "070030",
    "Yucatán":              "070031",
    "Zacatecas":            "070032",
}

_TRIMESTRE_A_MES = {1: 1, 2: 4, 3: 7, 4: 10}


def _fetch_serie(serie: str, geo_code: str, anio: int, trimestre: int,
                 token: str) -> float | None:
    """Llama BIE para un indicador + geografía + período. Retorna valor o None."""
    mes = _TRIMESTRE_A_MES[trimestre]
    periodo = f"{anio}/{mes:02d}"
    url = f"{_INEGI_API}/{serie}/es/{geo_code}/{periodo}/{periodo}/false/BIE/2.0/{token}.json"
    try:
        resp = httpx.get(url, timeout=15.0)
        resp.raise_for_status()
        data = resp.json()
        obs = data.get("Series", [{}])[0].get("Obs", [])
        if obs:
            return float(obs[0].get("OBS_VALUE", 0) or 0)
    except Exception as e:
        logger.warning("enoe_serie_error", serie=serie, geo=geo_code, error=str(e))
    return None


def fetch_enoe_indicadores(anio: int, trimestre: int, api_token: str) -> list[dict]:
    """Descarga TDA y población ocupada ENOE para todos los estados y Nacional.

    Retorna lista de dicts con campos del modelo IndicadorENOE.
    Si api_token vacío → retorna lista vacía.
    """
    if not api_token:
        logger.warning("enoe_no_token")
        return []

    fecha_corte = date(anio, _TRIMESTRE_A_MES[trimestre], 1)
    results = []
    for estado, geo_code in _GEOGRAFIAS.items():
        tda = _fetch_serie(_SERIE_TDA, geo_code, anio, trimestre, api_token)
        pob = _fetch_serie(_SERIE_POB, geo_code, anio, trimestre, api_token)
        if tda is not None or pob is not None:
            results.append({
                "estado": estado,
                "anio": anio,
                "trimestre": trimestre,
                "tasa_desempleo": tda,
                "poblacion_ocupada": int(pob) if pob is not None else None,
                "fecha_corte": fecha_corte,
            })
    logger.info("enoe_fetch_ok", anio=anio, trimestre=trimestre, registros=len(results))
    return results
```

- [ ] **Step 4: Correr tests — verificar que pasan**

```bash
cd ~/Documents/OIA-EE && source pipeline/.venv/bin/activate && python -m pytest tests/loaders/test_enoe_loader.py -v
```

Expected:
```
tests/loaders/test_enoe_loader.py::test_fetch_retorna_lista_con_campos_correctos PASSED
tests/loaders/test_enoe_loader.py::test_fetch_retorna_lista_vacia_si_token_ausente PASSED
tests/loaders/test_enoe_loader.py::test_fetch_retorna_lista_vacia_si_api_falla_en_todos PASSED
3 passed
```

- [ ] **Step 5: Commit**

```bash
cd ~/Documents/OIA-EE && git add pipeline/loaders/enoe_loader.py tests/loaders/test_enoe_loader.py && git commit -m "feat(p2b): add INEGI ENOE loader with BIE API and state geography catalog"
```

---

### Task 3: enoe_ingest_job.py con TDD

**Files:**
- Create: `tests/jobs/test_enoe_ingest_job.py`
- Create: `pipeline/jobs/enoe_ingest_job.py`

- [ ] **Step 1: Escribir tests que fallan**

Crear `tests/jobs/test_enoe_ingest_job.py`:

```python
# tests/jobs/test_enoe_ingest_job.py
import pytest
from datetime import date
from unittest.mock import patch
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from pipeline.db.models import Base
from pipeline.db.models_enoe import IndicadorENOE
from pipeline.jobs.enoe_ingest_job import run_enoe_ingest


@pytest.fixture
def session():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    s = Session()
    yield s
    s.rollback()
    s.close()


_FAKE_RECORDS = [
    {"estado": "Nacional", "anio": 2025, "trimestre": 1,
     "tasa_desempleo": 2.9, "poblacion_ocupada": 57000,
     "fecha_corte": date(2025, 1, 1)},
    {"estado": "Jalisco", "anio": 2025, "trimestre": 1,
     "tasa_desempleo": 2.4, "poblacion_ocupada": 3800,
     "fecha_corte": date(2025, 1, 1)},
]


def test_inserta_nuevos_registros(session):
    with patch("pipeline.jobs.enoe_ingest_job.fetch_enoe_indicadores",
               return_value=_FAKE_RECORDS):
        result = run_enoe_ingest(session)

    assert result["insertados"] == 2
    assert result["actualizados"] == 0
    assert session.query(IndicadorENOE).count() == 2


def test_upsert_actualiza_tasa_existente(session):
    with patch("pipeline.jobs.enoe_ingest_job.fetch_enoe_indicadores",
               return_value=_FAKE_RECORDS):
        run_enoe_ingest(session)

    updated = [
        {"estado": "Nacional", "anio": 2025, "trimestre": 1,
         "tasa_desempleo": 3.1, "poblacion_ocupada": 57100,
         "fecha_corte": date(2025, 1, 1)},
    ]
    with patch("pipeline.jobs.enoe_ingest_job.fetch_enoe_indicadores",
               return_value=updated):
        result = run_enoe_ingest(session)

    assert result["actualizados"] == 1
    assert result["insertados"] == 0
    nacional = session.query(IndicadorENOE).filter_by(
        estado="Nacional", anio=2025, trimestre=1
    ).first()
    assert nacional.tasa_desempleo == pytest.approx(3.1)
    assert nacional.poblacion_ocupada == 57100


def test_lista_vacia_no_falla(session):
    with patch("pipeline.jobs.enoe_ingest_job.fetch_enoe_indicadores", return_value=[]):
        result = run_enoe_ingest(session)
    assert result["procesados"] == 0
```

- [ ] **Step 2: Correr tests — verificar que fallan**

```bash
cd ~/Documents/OIA-EE && source pipeline/.venv/bin/activate && python -m pytest tests/jobs/test_enoe_ingest_job.py -v
```

Expected: ERROR — ModuleNotFoundError: `enoe_ingest_job` no existe aún

- [ ] **Step 3: Implementar enoe_ingest_job.py**

Crear `pipeline/jobs/enoe_ingest_job.py`:

```python
# pipeline/jobs/enoe_ingest_job.py
"""Job trimestral: descarga indicadores ENOE → upsert en indicador_enoe."""
import os
from datetime import date
import structlog
from sqlalchemy.orm import Session
from pipeline.loaders.enoe_loader import fetch_enoe_indicadores
from pipeline.db.models_enoe import IndicadorENOE

logger = structlog.get_logger()


def _trimestre_anterior(hoy: date | None = None) -> tuple[int, int]:
    """Retorna (anio, trimestre) del trimestre anterior a hoy."""
    ref = hoy or date.today()
    mes = ref.month
    if mes <= 3:
        return ref.year - 1, 4
    elif mes <= 6:
        return ref.year, 1
    elif mes <= 9:
        return ref.year, 2
    else:
        return ref.year, 3


def run_enoe_ingest(session: Session, anio: int | None = None,
                    trimestre: int | None = None) -> dict:
    """Descarga indicadores ENOE y hace upsert en la BD.

    Si anio/trimestre no se especifican usa el trimestre anterior.
    Retorna {"procesados": N, "insertados": N, "actualizados": N}.
    """
    if anio is None and trimestre is None:
        anio, trimestre = _trimestre_anterior()

    api_token = os.getenv("INEGI_API_TOKEN", "")
    records = fetch_enoe_indicadores(anio, trimestre, api_token)
    procesados = insertados = actualizados = 0

    for r in records:
        procesados += 1
        existing = session.query(IndicadorENOE).filter_by(
            estado=r["estado"],
            anio=r["anio"],
            trimestre=r["trimestre"],
        ).first()

        if existing:
            if r.get("tasa_desempleo") is not None:
                existing.tasa_desempleo = r["tasa_desempleo"]
            if r.get("poblacion_ocupada") is not None:
                existing.poblacion_ocupada = r["poblacion_ocupada"]
            if r.get("fecha_corte"):
                existing.fecha_corte = r["fecha_corte"]
            actualizados += 1
        else:
            session.add(IndicadorENOE(
                estado=r["estado"],
                anio=r["anio"],
                trimestre=r["trimestre"],
                tasa_desempleo=r.get("tasa_desempleo"),
                poblacion_ocupada=r.get("poblacion_ocupada"),
                fecha_corte=r.get("fecha_corte"),
            ))
            insertados += 1

    session.flush()
    result = {"procesados": procesados, "insertados": insertados,
              "actualizados": actualizados}
    logger.info("enoe_ingest_complete", **result)
    return result
```

- [ ] **Step 4: Correr tests — verificar que pasan**

```bash
cd ~/Documents/OIA-EE && source pipeline/.venv/bin/activate && python -m pytest tests/jobs/test_enoe_ingest_job.py -v
```

Expected: 3 passed

- [ ] **Step 5: Correr suite completa**

```bash
cd ~/Documents/OIA-EE && source pipeline/.venv/bin/activate && python -m pytest tests/ -q
```

Expected: 285+ passed, 0 failed

- [ ] **Step 6: Commit**

```bash
cd ~/Documents/OIA-EE && git add pipeline/jobs/enoe_ingest_job.py tests/jobs/test_enoe_ingest_job.py && git commit -m "feat(p2b): add ENOE ingest job with quarterly upsert"
```

---

### Task 4: Agregar job trimestral al scheduler

**Files:**
- Modify: `pipeline/scheduler.py`

- [ ] **Step 1: Agregar función wrapper y job**

En `pipeline/scheduler.py`, agregar la función `run_enoe_loader()` después de `run_imss_loader()` y antes de los `scheduler.add_job(...)`:

```python
def run_enoe_loader():
    from pipeline.jobs.enoe_ingest_job import run_enoe_ingest
    from pipeline.db import get_session
    with get_session() as session:
        result = run_enoe_ingest(session)
        session.commit()
    logger.info("enoe_ingest OK: %s", result)
```

Y agregar el job al final de los `scheduler.add_job(...)` existentes (antes del `if __name__ == "__main__":`):

```python
scheduler.add_job(
    run_enoe_loader,
    trigger=CronTrigger(month="1,4,7,10", day=20, hour=4, minute=0),
    id="enoe_loader",
    name="Carga INEGI ENOE trimestral",
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

Expected: 285+ passed, 0 failed

- [ ] **Step 4: Commit**

```bash
cd ~/Documents/OIA-EE && git add pipeline/scheduler.py && git commit -m "feat(p2b): add ENOE quarterly job to scheduler (day 20 of Jan/Apr/Jul/Oct)"
```

---

### Task 5: Actualizar calcular_ies_s() en D5 — prioridad ENOE > IMSS > Vacante

**Files:**
- Modify: `pipeline/kpi_engine/d5_geografia.py`
- Modify: `tests/kpi_engine/test_d5_geografia.py`

- [ ] **Step 1: Agregar tests nuevos al final de tests/kpi_engine/test_d5_geografia.py**

Agregar al final del archivo (después de los tests existentes):

```python
from pipeline.db.models_enoe import IndicadorENOE


@pytest.fixture
def session_con_enoe_e_imss(session):
    from pipeline.db.models_imss import EmpleoFormalIMSS
    session.add(EmpleoFormalIMSS(
        estado="Jalisco", sector_scian="31", sector_nombre="Manufactura",
        anio=2025, mes=3, trabajadores=500_000,
    ))
    session.add(IndicadorENOE(
        estado="Jalisco", anio=2025, trimestre=1,
        tasa_desempleo=2.4, poblacion_ocupada=3800,
    ))
    session.flush()
    return session


def test_ies_s_prioridad_enoe_sobre_imss(session_con_enoe_e_imss):
    ies_s = calcular_ies_s("Jalisco", session_con_enoe_e_imss)
    # ENOE: 3800 * 1000 = 3_800_000 trabajadores → score muy alto
    assert ies_s > 0.5
    assert 0.0 <= ies_s <= 1.0


def test_ies_s_usa_imss_cuando_no_hay_enoe(session):
    from pipeline.db.models_imss import EmpleoFormalIMSS
    session.add(EmpleoFormalIMSS(
        estado="Sonora", sector_scian="31", sector_nombre="Manufactura",
        anio=2025, mes=3, trabajadores=200_000,
    ))
    session.flush()
    ies_s = calcular_ies_s("Sonora", session)
    assert ies_s > 0.5
    assert 0.0 <= ies_s <= 1.0


def test_ies_s_fallback_sin_enoe_ni_imss(session):
    ies_s = calcular_ies_s("Tlaxcala", session)
    assert ies_s == 0.5
```

- [ ] **Step 2: Correr tests nuevos — verificar que fallan**

```bash
cd ~/Documents/OIA-EE && source pipeline/.venv/bin/activate && python -m pytest tests/kpi_engine/test_d5_geografia.py::test_ies_s_prioridad_enoe_sobre_imss -v
```

Expected: FAILED — `calcular_ies_s` no usa ENOE aún

- [ ] **Step 3: Reemplazar el contenido completo de pipeline/kpi_engine/d5_geografia.py**

```python
import logging
from dataclasses import dataclass
from sqlalchemy import func as sqlalchemy_func
from sqlalchemy.orm import Session
from pipeline.db.models import IES, CarreraIES, Noticia, Vacante
from pipeline.db.models_imss import EmpleoFormalIMSS
from pipeline.db.models_enoe import IndicadorENOE

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
    """IES_S: empleo total por estado en [0,1]. Prioridad: ENOE > IMSS > Vacante."""
    despidos_nacionales = (
        session.query(Noticia)
        .filter(Noticia.causa_ia.isnot(None))
        .count()
    )

    # Prioridad 1: ENOE poblacion_ocupada (formal+informal)
    enoe = (
        session.query(IndicadorENOE)
        .filter(IndicadorENOE.estado == estado,
                IndicadorENOE.poblacion_ocupada.isnot(None))
        .order_by(IndicadorENOE.anio.desc(), IndicadorENOE.trimestre.desc())
        .first()
    )
    if enoe and enoe.poblacion_ocupada:
        empleo = enoe.poblacion_ocupada * 1000  # viene en miles
    else:
        # Prioridad 2: IMSS trabajadores (solo formal)
        latest_imss = (
            session.query(EmpleoFormalIMSS.anio, EmpleoFormalIMSS.mes)
            .filter(EmpleoFormalIMSS.estado == estado)
            .order_by(EmpleoFormalIMSS.anio.desc(), EmpleoFormalIMSS.mes.desc())
            .first()
        )
        if latest_imss:
            empleo = int(
                session.query(sqlalchemy_func.sum(EmpleoFormalIMSS.trabajadores))
                .filter(
                    EmpleoFormalIMSS.estado == estado,
                    EmpleoFormalIMSS.anio == latest_imss.anio,
                    EmpleoFormalIMSS.mes == latest_imss.mes,
                )
                .scalar() or 0
            )
        else:
            # Prioridad 3: conteo de vacantes (fallback original)
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

- [ ] **Step 4: Correr todos los tests D5**

```bash
cd ~/Documents/OIA-EE && source pipeline/.venv/bin/activate && python -m pytest tests/kpi_engine/test_d5_geografia.py -v
```

Expected: todos PASS (tests anteriores + 3 nuevos = 13 total)

- [ ] **Step 5: Correr suite completa**

```bash
cd ~/Documents/OIA-EE && source pipeline/.venv/bin/activate && python -m pytest tests/ -q
```

Expected: 288+ passed, 0 failed

- [ ] **Step 6: Commit**

```bash
cd ~/Documents/OIA-EE && git add pipeline/kpi_engine/d5_geografia.py tests/kpi_engine/test_d5_geografia.py && git commit -m "feat(p2b): D5 calcular_ies_s uses ENOE poblacion_ocupada as primary source"
```

---

### Task 6: Actualizar D3 — calcular_factor_macro() + modificar calcular_tdm()

**Files:**
- Modify: `pipeline/kpi_engine/d3_mercado.py`
- Modify: `tests/kpi_engine/test_d3.py`

- [ ] **Step 1: Agregar tests para factor_macro al final de tests/kpi_engine/test_d3.py**

Agregar al final del archivo (después de `test_calcular_d3_score_en_rango`):

```python
from pipeline.db.models_enoe import IndicadorENOE
from pipeline.kpi_engine.d3_mercado import calcular_factor_macro


def test_factor_macro_retorna_uno_sin_datos_enoe(session):
    factor = calcular_factor_macro(session)
    assert factor == 1.0


def test_factor_macro_tasa_igual_referencia(session):
    session.add(IndicadorENOE(
        estado="Nacional", anio=2025, trimestre=1, tasa_desempleo=3.5,
    ))
    session.flush()
    factor = calcular_factor_macro(session)
    assert factor == pytest.approx(1.0, abs=0.001)


def test_factor_macro_tasa_alta_amplifica(session):
    session.add(IndicadorENOE(
        estado="Nacional", anio=2025, trimestre=1, tasa_desempleo=7.0,
    ))
    session.flush()
    factor = calcular_factor_macro(session)
    assert factor == pytest.approx(2.0, abs=0.001)


def test_calcular_tdm_aplica_factor_macro(session):
    # Insertar tasa alta → TDM se amplifica
    session.add(IndicadorENOE(
        estado="Nacional", anio=2025, trimestre=1, tasa_desempleo=7.0,
    ))
    _noticia_despido(session, sector="Tech")
    _vacante(session, sector="Tech")
    _vacante(session, sector="Tech")
    session.flush()
    tdm = calcular_tdm(session, sector="Tech")
    # sin factor: 1/2 = 0.5; con factor 2.0: min(1.0, 0.5*2.0) = 1.0
    assert tdm == 1.0
```

- [ ] **Step 2: Correr tests nuevos — verificar que fallan**

```bash
cd ~/Documents/OIA-EE && source pipeline/.venv/bin/activate && python -m pytest tests/kpi_engine/test_d3.py::test_factor_macro_retorna_uno_sin_datos_enoe -v
```

Expected: ERROR — `calcular_factor_macro` no existe aún

- [ ] **Step 3: Reemplazar el contenido completo de pipeline/kpi_engine/d3_mercado.py**

```python
import json
import logging
from dataclasses import dataclass
from sqlalchemy import func as sqlalchemy_func
from sqlalchemy.orm import Session
from pipeline.db.models import Noticia, Vacante, CarreraIES
from pipeline.db.models_enoe import IndicadorENOE

logger = logging.getLogger(__name__)

MAX_VACANTES_D3 = 500
EMERGING_SKILLS = frozenset({
    "python", "machine learning", "inteligencia artificial", "ia", "cloud",
    "data science", "nlp", "deep learning", "llm", "big data", "tensorflow",
    "pytorch", "kubernetes", "docker", "mlops",
})
_TASA_REFERENCIA = 3.5  # % tasa histórica "sana" en México


@dataclass
class D3Result:
    tdm: float
    tvc: float
    brs: float
    ice: float
    score: float


def calcular_factor_macro(session: Session) -> float:
    """Factor multiplicador basado en tasa de desempleo nacional ENOE.

    Referencia sana: 3.5%. Por encima → amplifica riesgo TDM. Sin datos → 1.0.
    """
    latest = (
        session.query(IndicadorENOE.anio, IndicadorENOE.trimestre,
                      IndicadorENOE.tasa_desempleo)
        .filter(IndicadorENOE.estado == "Nacional",
                IndicadorENOE.tasa_desempleo.isnot(None))
        .order_by(IndicadorENOE.anio.desc(), IndicadorENOE.trimestre.desc())
        .first()
    )
    if latest is None or latest.tasa_desempleo is None:
        return 1.0
    return round(float(latest.tasa_desempleo) / _TASA_REFERENCIA, 4)


def calcular_tdm(session: Session, sector: str | None = None) -> float:
    """Tasa de Desplazamiento por Mercado amplificada por contexto macro ENOE. [0,1]"""
    q_despidos = session.query(Noticia).filter(Noticia.tipo_impacto == "despido")
    q_vacantes = session.query(Vacante)
    if sector:
        q_despidos = q_despidos.filter(Noticia.sector == sector)
        q_vacantes = q_vacantes.filter(Vacante.sector == sector)
    n_despidos = q_despidos.count()
    n_vacantes = q_vacantes.count()
    if n_vacantes == 0:
        return 0.0
    tdm_raw = n_despidos / n_vacantes
    factor = calcular_factor_macro(session)
    return min(1.0, round(tdm_raw * factor, 4))


def calcular_tvc(session: Session, sector: str | None = None) -> float:
    """Tasa de Vacantes vs Ceses: vacantes_IA / despidos_IA. >1 = neto positivo."""
    q_noticias = session.query(Noticia).filter(Noticia.tipo_impacto == "despido")
    q_vacantes = session.query(Vacante)
    if sector:
        q_noticias = q_noticias.filter(Noticia.sector == sector)
        q_vacantes = q_vacantes.filter(Vacante.sector == sector)
    n_despidos = q_noticias.count()
    vacantes = q_vacantes.limit(MAX_VACANTES_D3).all()
    n_ia = sum(
        1 for v in vacantes
        if set(s.lower().strip() for s in _parse_skills(v.skills)) & EMERGING_SKILLS
    )
    return n_ia / max(1, n_despidos)


def calcular_brs(carrera_ies: CarreraIES, session: Session) -> float:
    """Brecha de Reskilling: skills plan no demandados / total plan. [0,1]"""
    plan = set(s.lower().strip() for s in _parse_skills(carrera_ies.plan_estudio_skills))
    if not plan:
        return 0.5
    vacantes = session.query(Vacante).limit(MAX_VACANTES_D3).all()
    demanded: set[str] = set()
    for v in vacantes:
        demanded.update(s.lower().strip() for s in _parse_skills(v.skills))
    if not demanded:
        return 0.5
    missing = len(plan - demanded)
    return round(missing / len(plan), 4)


def calcular_ice(session: Session, sector: str | None = None) -> float:
    """Índice de Cobertura Emergente: vacantes_IA_sector / total_vacantes_sector. [0,1]"""
    q = session.query(Vacante)
    if sector:
        q = q.filter(Vacante.sector == sector)
    vacantes = q.limit(MAX_VACANTES_D3).all()
    if not vacantes:
        return 0.0
    n_ia = sum(
        1 for v in vacantes
        if set(s.lower().strip() for s in _parse_skills(v.skills)) & EMERGING_SKILLS
    )
    return round(n_ia / len(vacantes), 4)


def calcular_d3(carrera_ies: CarreraIES, session: Session, sector: str | None = None) -> D3Result:
    tdm = calcular_tdm(session, sector=sector)
    tvc = calcular_tvc(session, sector=sector)
    brs = calcular_brs(carrera_ies, session)
    ice = calcular_ice(session, sector=sector)
    score = round(min(1.0, tdm * 0.4 + brs * 0.4 + max(0.0, 1.0 - tvc) * 0.2), 4)
    return D3Result(
        tdm=round(tdm, 4),
        tvc=round(tvc, 4),
        brs=round(brs, 4),
        ice=round(ice, 4),
        score=score,
    )


def _parse_skills(raw: str | None) -> list[str]:
    try:
        return json.loads(raw or "[]")
    except (json.JSONDecodeError, TypeError):
        return []
```

- [ ] **Step 4: Correr todos los tests D3**

```bash
cd ~/Documents/OIA-EE && source pipeline/.venv/bin/activate && python -m pytest tests/kpi_engine/test_d3.py -v
```

Expected: todos PASS (tests anteriores + 4 nuevos = 10 total)

- [ ] **Step 5: Correr suite completa**

```bash
cd ~/Documents/OIA-EE && source pipeline/.venv/bin/activate && python -m pytest tests/ -q
```

Expected: 292+ passed, 0 failed

- [ ] **Step 6: Commit**

```bash
cd ~/Documents/OIA-EE && git add pipeline/kpi_engine/d3_mercado.py tests/kpi_engine/test_d3.py && git commit -m "feat(p2b): D3 calcular_tdm amplified by ENOE national unemployment factor"
```

---

### Task 7: Push y nota Obsidian

**Files:**
- External: GitHub + Obsidian Vault

- [ ] **Step 1: Push a origin**

```bash
cd ~/Documents/OIA-EE && git push origin main
```

- [ ] **Step 2: Guardar nota en Obsidian**

Crear `/Users/arturoaguilar/Documents/Obsidian Vault/01 - Proyectos/OIA-EE/p2b-enoe-completado.md`:

```markdown
# P2B INEGI ENOE — Completado 2026-04-27

## Resumen
D5 Geografía ahora usa empleo total (formal+informal) del INEGI ENOE.
D3 Mercado amplifica TDM según la tasa de desempleo nacional real.
Antes: D5 usaba solo empleo formal IMSS; D3 ignoraba contexto macro.
Ahora: D5 usa poblacion_ocupada ENOE (prioridad 1) con fallback IMSS → Vacante.
        D3 multiplica TDM por factor = tasa_real / 3.5% (referencia sana).

## Qué se implementó
- `pipeline/db/models_enoe.py` — modelo IndicadorENOE
- Migración Alembic `p2enoe001` (down_revision: p2imss001)
- `pipeline/loaders/enoe_loader.py` — API BIE INEGI con token
- `pipeline/jobs/enoe_ingest_job.py` — upsert trimestral
- `pipeline/scheduler.py` — job día 20 de ene/abr/jul/oct a las 4am
- `pipeline/kpi_engine/d5_geografia.py` — prioridad ENOE > IMSS > Vacante
- `pipeline/kpi_engine/d3_mercado.py` — calcular_factor_macro() + TDM amplificado

## Variable de entorno nueva
`INEGI_API_TOKEN` — token gratuito en https://www.inegi.org.mx/app/desarrolladores/generatoken/
Configurar en Railway: railway variables --set INEGI_API_TOKEN=<token>

#OIA-EE #p2b #enoe #inegi #d5 #d3 #completado #2026-04-27
```

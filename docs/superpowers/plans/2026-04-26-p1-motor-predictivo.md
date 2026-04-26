# P1: Motor Predictivo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el motor predictivo de OIA-EE: forecasting de D1/D2 por carrera con statsforecast, agregación de skills emergentes desde vacantes, API de predicciones y dashboard con gráfica de fan + semáforo 1/3/5 años.

**Architecture:** `KpiHistorico` → `pipeline/predictor/forecaster.py` (statsforecast AutoETS) → `predicciones_kpi` (DB) → `GET /predicciones/carrera/{id}` → frontend `FanChart` (Recharts). Skills: `Vacante.skills` → `skills_aggregator.py` → `SkillEmergente.menciones_30d`. Jobs semanales APScheduler domingo 4am. Requiere ≥8 puntos históricos por serie.

**Tech Stack:** statsforecast 1.7.3 (Nixtla), pandas 2.2.2 (ya instalado), Recharts 2.x (nuevo), FastAPI, SQLAlchemy, APScheduler (ya configurado).

**Dependencias:** P0 (RBAC, scheduler en main.py) + P8 (skills_emergentes tabla ya existe).

---

## Archivos que se crean o modifican

### Nuevos
- `pipeline/db/models_predictor.py` — modelo `PrediccionKpi`
- `pipeline/db/migrations/versions/p1pred001_p1_predicciones_kpi.py` — migración
- `pipeline/predictor/__init__.py` — paquete
- `pipeline/predictor/forecaster.py` — wrapper statsforecast: `run_forecast(series, horizonte_trimestres) -> list[PredRow]`
- `pipeline/predictor/skills_aggregator.py` — `aggregate_skills_from_vacantes(db) -> int`
- `pipeline/jobs/forecast_job.py` — jobs semanales
- `api/routers/predicciones.py` — `GET /predicciones/carrera/{id}`
- `frontend/src/components/FanChart.tsx` — gráfica de fan con CI bands (Recharts)
- `tests/predictor/__init__.py`
- `tests/predictor/test_forecaster.py`
- `tests/predictor/test_skills_aggregator.py`
- `tests/api/test_predicciones_router.py`

### Modificados
- `pipeline/db/models.py` — import `PrediccionKpi` para Alembic
- `pipeline/requirements.txt` — agregar `statsforecast==1.7.3`
- `api/main.py` — registrar router + jobs en scheduler
- `frontend/package.json` — agregar `recharts`
- `frontend/src/app/carreras/[id]/page.tsx` — sección FanChart + semáforo

---

## Task 1: Modelo DB predicciones_kpi

**Files:**
- Create: `pipeline/db/models_predictor.py`
- Modify: `pipeline/db/models.py`
- Create: `pipeline/db/migrations/versions/p1pred001_p1_predicciones_kpi.py`
- Test: `tests/predictor/test_predictor_model.py`

- [ ] **Step 1: Crear directorio y escribir tests que fallan**

```bash
mkdir -p ~/Documents/OIA-EE/tests/predictor
touch ~/Documents/OIA-EE/tests/predictor/__init__.py
```

```python
# tests/predictor/test_predictor_model.py
from datetime import date, datetime, UTC
from pipeline.db.models_predictor import PrediccionKpi


def test_prediccion_kpi_crea_con_campos_minimos(session):
    pred = PrediccionKpi(
        entidad_tipo="carrera",
        entidad_id="carrera-abc-123",
        kpi_nombre="D1",
        horizonte_años=3,
        fecha_prediccion=date(2028, 1, 1),
        valor_predicho=0.72,
        ci_80_lower=0.65,
        ci_80_upper=0.79,
        ci_95_lower=0.61,
        ci_95_upper=0.83,
        modelo_version="AutoETS-v1",
    )
    session.add(pred)
    session.flush()
    assert pred.id is not None
    assert pred.fecha_generacion is not None


def test_prediccion_kpi_indice_entidad(session):
    """Verifica que se puede consultar por entidad_tipo + entidad_id + kpi_nombre."""
    from pipeline.db.models_predictor import PrediccionKpi
    pred = PrediccionKpi(
        entidad_tipo="carrera",
        entidad_id="xyz-999",
        kpi_nombre="D2",
        horizonte_años=1,
        fecha_prediccion=date(2027, 1, 1),
        valor_predicho=0.55,
        ci_80_lower=0.48,
        ci_80_upper=0.62,
        ci_95_lower=0.44,
        ci_95_upper=0.66,
        modelo_version="AutoETS-v1",
    )
    session.add(pred)
    session.flush()
    found = (
        session.query(PrediccionKpi)
        .filter_by(entidad_id="xyz-999", kpi_nombre="D2")
        .first()
    )
    assert found is not None
    assert found.valor_predicho == 0.55
```

- [ ] **Step 2: Verificar que falla**

```bash
cd ~/Documents/OIA-EE && source pipeline/.venv/bin/activate
python -m pytest tests/predictor/test_predictor_model.py -v 2>&1 | tail -5
```

Expected: `ImportError: No module named 'pipeline.db.models_predictor'`

- [ ] **Step 3: Crear `pipeline/db/models_predictor.py`**

```python
# pipeline/db/models_predictor.py
"""Modelo SQLAlchemy para predicciones del Motor Predictivo P1."""
from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, Date, DateTime, Index
from pipeline.db.models import Base, _uuid


class PrediccionKpi(Base):
    __tablename__ = "predicciones_kpi"

    id               = Column(String(36), primary_key=True, default=_uuid)
    entidad_tipo     = Column(String(20), nullable=False)   # 'carrera', 'ies', 'estado'
    entidad_id       = Column(String(36), nullable=False)
    kpi_nombre       = Column(String(10), nullable=False)   # 'D1', 'D2', ...
    horizonte_años   = Column(Integer, nullable=False)      # 1, 3, 5
    fecha_prediccion = Column(Date, nullable=False)
    valor_predicho   = Column(Float, nullable=False)
    ci_80_lower      = Column(Float)
    ci_80_upper      = Column(Float)
    ci_95_lower      = Column(Float)
    ci_95_upper      = Column(Float)
    modelo_version   = Column(String(20), nullable=False)
    fecha_generacion = Column(DateTime(timezone=True), default=datetime.utcnow)

    __table_args__ = (
        Index("idx_pred_entidad_kpi", "entidad_tipo", "entidad_id", "kpi_nombre"),
    )
```

- [ ] **Step 4: Agregar import al final de `pipeline/db/models.py`**

Agregar esta línea al final del archivo (después del import de models_radar):

```python
from pipeline.db.models_predictor import PrediccionKpi  # noqa: F401
```

- [ ] **Step 5: Crear migración manual**

Leer la última revisión: `p8radar001`. Crear `pipeline/db/migrations/versions/p1pred001_p1_predicciones_kpi.py`:

```python
"""p1_predicciones_kpi

Revision ID: p1pred001
Revises: p8radar001
Create Date: 2026-04-26

"""
from alembic import op
import sqlalchemy as sa

revision = 'p1pred001'
down_revision = 'p8radar001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'predicciones_kpi',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('entidad_tipo', sa.String(20), nullable=False),
        sa.Column('entidad_id', sa.String(36), nullable=False),
        sa.Column('kpi_nombre', sa.String(10), nullable=False),
        sa.Column('horizonte_años', sa.Integer(), nullable=False),
        sa.Column('fecha_prediccion', sa.Date(), nullable=False),
        sa.Column('valor_predicho', sa.Float(), nullable=False),
        sa.Column('ci_80_lower', sa.Float()),
        sa.Column('ci_80_upper', sa.Float()),
        sa.Column('ci_95_lower', sa.Float()),
        sa.Column('ci_95_upper', sa.Float()),
        sa.Column('modelo_version', sa.String(20), nullable=False),
        sa.Column('fecha_generacion', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('idx_pred_entidad_kpi', 'predicciones_kpi',
                    ['entidad_tipo', 'entidad_id', 'kpi_nombre'])


def downgrade() -> None:
    op.drop_index('idx_pred_entidad_kpi', table_name='predicciones_kpi')
    op.drop_table('predicciones_kpi')
```

- [ ] **Step 6: Correr tests**

```bash
python -m pytest tests/predictor/test_predictor_model.py -v
```

Expected: `2 passed`

- [ ] **Step 7: Correr suite completa**

```bash
python -m pytest tests/ -q 2>&1 | tail -3
```

Expected: todos pasan.

- [ ] **Step 8: Commit**

```bash
git add pipeline/db/models_predictor.py pipeline/db/models.py \
        pipeline/db/migrations/versions/p1pred001_p1_predicciones_kpi.py \
        tests/predictor/
git commit -m "feat(p1): add predicciones_kpi model and migration"
```

---

## Task 2: statsforecast Forecaster Engine

**Files:**
- Create: `pipeline/predictor/__init__.py`
- Create: `pipeline/predictor/forecaster.py`
- Modify: `pipeline/requirements.txt`
- Test: `tests/predictor/test_forecaster.py`

- [ ] **Step 1: Agregar statsforecast a requirements.txt e instalar**

Agregar al final de `pipeline/requirements.txt`:
```text
statsforecast==1.7.3
```

```bash
pip install statsforecast==1.7.3
```

- [ ] **Step 2: Crear paquete predictor**

```bash
mkdir -p ~/Documents/OIA-EE/pipeline/predictor
touch ~/Documents/OIA-EE/pipeline/predictor/__init__.py
```

- [ ] **Step 3: Escribir tests que fallan**

```python
# tests/predictor/test_forecaster.py
import pytest
from unittest.mock import patch, MagicMock
from datetime import date
import pandas as pd
from pipeline.predictor.forecaster import run_forecast, PredRow, _MIN_POINTS


def _make_series(n: int) -> list[tuple[date, float]]:
    """Serie de n puntos trimestrales."""
    from datetime import date
    import datetime
    return [
        (date(2022 + i // 4, (i % 4) * 3 + 1, 1), 0.50 + i * 0.01)
        for i in range(n)
    ]


def test_run_forecast_returns_empty_on_insufficient_data():
    """Con menos de _MIN_POINTS puntos, retorna lista vacía sin llamar statsforecast."""
    series = _make_series(_MIN_POINTS - 1)
    result = run_forecast(series, horizonte_trimestres=4)
    assert result == []


def test_run_forecast_returns_pred_rows_on_valid_data():
    """Con datos suficientes, retorna lista de PredRow con CI correcto."""
    mock_forecast_df = pd.DataFrame({
        'unique_id': ['serie'] * 4,
        'ds': pd.date_range('2025-01-01', periods=4, freq='QS'),
        'AutoETS': [0.72, 0.74, 0.76, 0.78],
        'AutoETS-lo-80': [0.68, 0.70, 0.72, 0.74],
        'AutoETS-hi-80': [0.76, 0.78, 0.80, 0.82],
        'AutoETS-lo-95': [0.65, 0.67, 0.69, 0.71],
        'AutoETS-hi-95': [0.79, 0.81, 0.83, 0.85],
    })

    with patch('pipeline.predictor.forecaster.StatsForecast') as MockSF:
        mock_instance = MockSF.return_value
        mock_instance.predict.return_value = mock_forecast_df

        series = _make_series(_MIN_POINTS + 2)
        result = run_forecast(series, horizonte_trimestres=4)

    assert len(result) == 4
    assert all(isinstance(r, PredRow) for r in result)
    assert result[0].valor_predicho == pytest.approx(0.72)
    assert result[0].ci_80_lower == pytest.approx(0.68)
    assert result[0].ci_95_upper == pytest.approx(0.79)


def test_run_forecast_returns_empty_on_statsforecast_exception():
    """Si statsforecast lanza excepción, retorna lista vacía sin propagar."""
    with patch('pipeline.predictor.forecaster.StatsForecast') as MockSF:
        mock_instance = MockSF.return_value
        mock_instance.predict.side_effect = Exception("statsforecast error")

        series = _make_series(_MIN_POINTS + 2)
        result = run_forecast(series, horizonte_trimestres=4)

    assert result == []
```

- [ ] **Step 4: Correr para verificar que falla**

```bash
python -m pytest tests/predictor/test_forecaster.py -v 2>&1 | tail -5
```

Expected: `ImportError: cannot import name 'run_forecast'`

- [ ] **Step 5: Crear `pipeline/predictor/forecaster.py`**

```python
# pipeline/predictor/forecaster.py
"""Motor de predicción: wrapper statsforecast para series KPI."""
import structlog
from dataclasses import dataclass
from datetime import date
from typing import Optional
import pandas as pd
from statsforecast import StatsForecast
from statsforecast.models import AutoETS

logger = structlog.get_logger()

_MIN_POINTS = 8          # mínimo de puntos para correr el modelo
_MODEL_VERSION = "AutoETS-v1"


@dataclass
class PredRow:
    fecha_prediccion: date
    valor_predicho: float
    ci_80_lower: Optional[float]
    ci_80_upper: Optional[float]
    ci_95_lower: Optional[float]
    ci_95_upper: Optional[float]
    modelo_version: str = _MODEL_VERSION


def run_forecast(
    series: list[tuple[date, float]],
    horizonte_trimestres: int = 20,  # 5 años = 20 trimestres
) -> list[PredRow]:
    """Corre AutoETS sobre la serie histórica y devuelve predicciones trimestrales.

    series: lista de (fecha, valor) ordenada por fecha ascendente.
    horizonte_trimestres: número de trimestres a predecir.
    Retorna [] si hay menos de _MIN_POINTS puntos o si falla el modelo.
    """
    if len(series) < _MIN_POINTS:
        logger.debug("forecast_skipped_insufficient_data", n_points=len(series))
        return []

    df = pd.DataFrame({
        'unique_id': ['serie'] * len(series),
        'ds': pd.to_datetime([str(f) for f, _ in series]),
        'y': [float(v) for _, v in series],
    })

    try:
        sf = StatsForecast(
            models=[AutoETS(season_length=1)],
            freq='QS',
            n_jobs=1,
        )
        sf.fit(df)
        forecast_df = sf.predict(h=horizonte_trimestres, level=[80, 95])
    except Exception as e:
        logger.error("forecast_failed", error=str(e), n_points=len(series))
        return []

    rows = []
    for _, row in forecast_df.iterrows():
        rows.append(PredRow(
            fecha_prediccion=row['ds'].date() if hasattr(row['ds'], 'date') else row['ds'],
            valor_predicho=float(row.get('AutoETS', 0.0)),
            ci_80_lower=_safe_float(row.get('AutoETS-lo-80')),
            ci_80_upper=_safe_float(row.get('AutoETS-hi-80')),
            ci_95_lower=_safe_float(row.get('AutoETS-lo-95')),
            ci_95_upper=_safe_float(row.get('AutoETS-hi-95')),
        ))

    logger.info("forecast_complete", n_predictions=len(rows), horizonte=horizonte_trimestres)
    return rows


def _safe_float(val) -> Optional[float]:
    try:
        return float(val) if val is not None else None
    except (TypeError, ValueError):
        return None
```

- [ ] **Step 6: Correr tests**

```bash
python -m pytest tests/predictor/test_forecaster.py -v
```

Expected: `3 passed`

- [ ] **Step 7: Correr suite completa**

```bash
python -m pytest tests/ -q 2>&1 | tail -3
```

- [ ] **Step 8: Commit**

```bash
git add pipeline/predictor/ pipeline/requirements.txt tests/predictor/test_forecaster.py
git commit -m "feat(p1): statsforecast AutoETS engine for KPI time-series prediction"
```

---

## Task 3: Skills Aggregator

**Files:**
- Create: `pipeline/predictor/skills_aggregator.py`
- Test: `tests/predictor/test_skills_aggregator.py`

- [ ] **Step 1: Escribir tests que fallan**

```python
# tests/predictor/test_skills_aggregator.py
import json
import pytest
from pipeline.predictor.skills_aggregator import aggregate_skills_from_vacantes
from pipeline.db.models import Vacante
from pipeline.db.models_radar import SkillEmergente
from datetime import date


def test_aggregate_skills_counts_mentions(session):
    """Agrega skills de vacantes y actualiza menciones_30d en SkillEmergente."""
    # 3 vacantes con skills superpuestos
    session.add_all([
        Vacante(titulo="Dev A", skills="Python, SQL, Machine Learning", fecha_pub=date.today()),
        Vacante(titulo="Dev B", skills="Python, Docker, Kubernetes", fecha_pub=date.today()),
        Vacante(titulo="Dev C", skills="SQL, FastAPI, Python", fecha_pub=date.today()),
    ])
    session.flush()

    count = aggregate_skills_from_vacantes(db=session)

    assert count > 0
    # Python aparece 3 veces
    python_sk = session.query(SkillEmergente).filter_by(skill="Python").first()
    assert python_sk is not None
    assert python_sk.menciones_30d >= 3


def test_aggregate_skills_updates_existing(session):
    """Si el skill ya existe, actualiza menciones_30d en lugar de duplicar."""
    # Pre-insertar skill
    existing = SkillEmergente(skill="SQL", categoria="tecnica", menciones_30d=10)
    session.add(existing)
    session.flush()

    session.add(Vacante(titulo="Analista", skills="SQL, Excel", fecha_pub=date.today()))
    session.flush()

    aggregate_skills_from_vacantes(db=session)

    skills = session.query(SkillEmergente).filter_by(skill="SQL").all()
    assert len(skills) == 1  # no duplicar
    assert skills[0].menciones_30d >= 1
```

- [ ] **Step 2: Correr para verificar que falla**

```bash
python -m pytest tests/predictor/test_skills_aggregator.py -v 2>&1 | tail -5
```

Expected: `ImportError`

- [ ] **Step 3: Implementar `pipeline/predictor/skills_aggregator.py`**

```python
# pipeline/predictor/skills_aggregator.py
"""Agrega skills de vacantes recientes y actualiza skills_emergentes."""
import re
import structlog
from collections import Counter
from datetime import datetime, timedelta, UTC
from sqlalchemy.orm import Session
from pipeline.db.models import Vacante
from pipeline.db.models_radar import SkillEmergente

logger = structlog.get_logger()

_DAYS_BACK = 30
_MIN_SKILL_LEN = 2
_MAX_SKILL_LEN = 100


def _parse_skills(raw: str) -> list[str]:
    """Extrae skills normalizados de un string comma-separated o JSON array."""
    if not raw:
        return []
    # Intentar JSON primero
    try:
        import json
        parsed = json.loads(raw)
        if isinstance(parsed, list):
            return [s.strip() for s in parsed if isinstance(s, str) and _MIN_SKILL_LEN <= len(s.strip()) <= _MAX_SKILL_LEN]
    except Exception:
        pass
    # Fallback: comma-separated
    skills = [s.strip() for s in re.split(r'[,;|]', raw)]
    return [s for s in skills if _MIN_SKILL_LEN <= len(s) <= _MAX_SKILL_LEN]


def aggregate_skills_from_vacantes(db: Session, days_back: int = _DAYS_BACK) -> int:
    """Lee vacantes de los últimos `days_back` días, cuenta skills y actualiza skills_emergentes.

    Retorna el número de skills únicos procesados.
    """
    cutoff = datetime.now(UTC).date() - timedelta(days=days_back)
    vacantes = (
        db.query(Vacante)
        .filter(Vacante.fecha_pub >= cutoff)
        .filter(Vacante.skills.isnot(None))
        .all()
    )

    counter: Counter = Counter()
    for v in vacantes:
        for skill in _parse_skills(v.skills or ""):
            # Normalizar: título case para consistencia
            counter[skill.title()] += 1

    logger.info("skills_aggregation_start", vacantes=len(vacantes), skills_unicos=len(counter))

    for skill_name, count in counter.items():
        existing = db.query(SkillEmergente).filter_by(skill=skill_name).first()
        if existing:
            existing.menciones_30d = count
        else:
            db.add(SkillEmergente(
                skill=skill_name,
                categoria="tecnica",
                menciones_30d=count,
            ))

    db.flush()
    logger.info("skills_aggregation_done", skills_actualizados=len(counter))
    return len(counter)
```

- [ ] **Step 4: Correr tests**

```bash
python -m pytest tests/predictor/test_skills_aggregator.py -v
```

Expected: `2 passed`

- [ ] **Step 5: Correr suite completa**

```bash
python -m pytest tests/ -q 2>&1 | tail -3
```

- [ ] **Step 6: Commit**

```bash
git add pipeline/predictor/skills_aggregator.py tests/predictor/test_skills_aggregator.py
git commit -m "feat(p1): skills aggregator - counts vacantes skills into skills_emergentes"
```

---

## Task 4: Forecast Job + Scheduler

**Files:**
- Create: `pipeline/jobs/forecast_job.py`
- Modify: `api/main.py`

No tests nuevos (el job llama a funciones ya testeadas). Solo verificar que el job importa sin error.

- [ ] **Step 1: Crear `pipeline/jobs/forecast_job.py`**

```python
# pipeline/jobs/forecast_job.py
"""Jobs semanales del Motor Predictivo P1."""
import structlog
from sqlalchemy.orm import Session
from pipeline.db import get_session
from pipeline.db.models import KpiHistorico, Carrera
from pipeline.db.models_predictor import PrediccionKpi
from pipeline.predictor.forecaster import run_forecast
from pipeline.predictor.skills_aggregator import aggregate_skills_from_vacantes

logger = structlog.get_logger()

_HORIZONTES = {1: 4, 3: 12, 5: 20}  # años → trimestres
_KPIS = ["D1", "D2"]


def _get_series(db: Session, entidad_id: str, kpi_nombre: str) -> list[tuple]:
    """Obtiene serie histórica (fecha, valor) de KpiHistorico para una entidad+KPI."""
    rows = (
        db.query(KpiHistorico.fecha, KpiHistorico.valor)
        .filter_by(entidad_tipo="carrera", entidad_id=entidad_id, kpi_nombre=kpi_nombre)
        .order_by(KpiHistorico.fecha.asc())
        .all()
    )
    return [(r.fecha, float(r.valor)) for r in rows if r.valor is not None]


def run_forecast_job() -> None:
    """Job semanal: corre statsforecast para todas las carreras con ≥8 puntos históricos."""
    with get_session() as db:
        carreras = db.query(Carrera).all()
        total_preds = 0

        for carrera in carreras:
            for kpi in _KPIS:
                series = _get_series(db, carrera.id, kpi)
                for años, trimestres in _HORIZONTES.items():
                    pred_rows = run_forecast(series, horizonte_trimestres=trimestres)
                    if not pred_rows:
                        continue
                    # Borrar predicciones previas para este horizonte
                    db.query(PrediccionKpi).filter_by(
                        entidad_tipo="carrera",
                        entidad_id=carrera.id,
                        kpi_nombre=kpi,
                        horizonte_años=años,
                    ).delete()
                    for row in pred_rows:
                        db.add(PrediccionKpi(
                            entidad_tipo="carrera",
                            entidad_id=carrera.id,
                            kpi_nombre=kpi,
                            horizonte_años=años,
                            fecha_prediccion=row.fecha_prediccion,
                            valor_predicho=row.valor_predicho,
                            ci_80_lower=row.ci_80_lower,
                            ci_80_upper=row.ci_80_upper,
                            ci_95_lower=row.ci_95_lower,
                            ci_95_upper=row.ci_95_upper,
                            modelo_version=row.modelo_version,
                        ))
                        total_preds += 1
        logger.info("forecast_job_done", carreras=len(carreras), predicciones=total_preds)


def run_skills_job() -> None:
    """Job semanal: agrega skills de vacantes recientes → skills_emergentes."""
    with get_session() as db:
        count = aggregate_skills_from_vacantes(db)
        logger.info("skills_job_done", skills_actualizados=count)
```

- [ ] **Step 2: Verificar que importa sin error**

```bash
cd ~/Documents/OIA-EE && source pipeline/.venv/bin/activate
python -c "from pipeline.jobs.forecast_job import run_forecast_job, run_skills_job; print('OK')"
```

Expected: `OK`

- [ ] **Step 3: Agregar jobs al scheduler en `api/main.py`**

Leer `api/main.py`. Encontrar el bloque `if os.getenv("ENABLE_SCHEDULER"):` donde se agregan los jobs con `_scheduler.add_job`. Añadir al final de ese bloque (antes del `_scheduler.start()`):

```python
from pipeline.jobs.forecast_job import run_forecast_job, run_skills_job
# ...en el bloque ENABLE_SCHEDULER:
_scheduler.add_job(run_forecast_job, "cron", day_of_week="sun", hour=4)    # domingo 4am
_scheduler.add_job(run_skills_job, "cron", day_of_week="sun", hour=5)       # domingo 5am
```

- [ ] **Step 4: Verificar que main.py arranca sin error**

```bash
python -c "from api.main import app; print('OK')"
```

Expected: `OK`

- [ ] **Step 5: Correr suite completa**

```bash
python -m pytest tests/ -q 2>&1 | tail -3
```

Expected: todos pasan.

- [ ] **Step 6: Commit**

```bash
git add pipeline/jobs/forecast_job.py api/main.py
git commit -m "feat(p1): forecast job (weekly sunday 4am) + skills job (sunday 5am)"
```

---

## Task 5: API Router de Predicciones

**Files:**
- Create: `api/routers/predicciones.py`
- Modify: `api/main.py`
- Test: `tests/api/test_predicciones_router.py`

- [ ] **Step 1: Escribir tests que fallan**

```python
# tests/api/test_predicciones_router.py
from datetime import date
from pipeline.db.models_predictor import PrediccionKpi


def test_predicciones_carrera_empty_returns_ok(client):
    """Sin predicciones en DB, retorna 200 con listas vacías."""
    response = client.get("/predicciones/carrera/carrera-inexistente")
    assert response.status_code == 200
    data = response.json()
    assert "carrera_id" in data
    assert "predicciones" in data
    assert isinstance(data["predicciones"], dict)


def test_predicciones_carrera_returns_horizonte_data(client, session):
    """Con predicciones en DB, las retorna agrupadas por horizonte."""
    pred = PrediccionKpi(
        entidad_tipo="carrera",
        entidad_id="carrera-test-999",
        kpi_nombre="D1",
        horizonte_años=3,
        fecha_prediccion=date(2028, 1, 1),
        valor_predicho=0.75,
        ci_80_lower=0.68,
        ci_80_upper=0.82,
        ci_95_lower=0.64,
        ci_95_upper=0.86,
        modelo_version="AutoETS-v1",
    )
    session.add(pred)
    session.commit()

    response = client.get("/predicciones/carrera/carrera-test-999?kpi=D1&horizonte=3")
    assert response.status_code == 200
    data = response.json()
    assert data["carrera_id"] == "carrera-test-999"
    assert "D1" in data["predicciones"]
    preds_d1 = data["predicciones"]["D1"]
    assert len(preds_d1) >= 1
    assert preds_d1[0]["valor_predicho"] == 0.75


def test_predicciones_semaforo_returns_colores(client, session):
    """El semáforo retorna color verde/amarillo/rojo según valor_predicho de D1."""
    session.add_all([
        PrediccionKpi(entidad_tipo="carrera", entidad_id="sem-test", kpi_nombre="D1",
                      horizonte_años=1, fecha_prediccion=date(2027, 1, 1),
                      valor_predicho=0.45, ci_80_lower=0.40, ci_80_upper=0.50,
                      ci_95_lower=0.38, ci_95_upper=0.52, modelo_version="AutoETS-v1"),
        PrediccionKpi(entidad_tipo="carrera", entidad_id="sem-test", kpi_nombre="D1",
                      horizonte_años=3, fecha_prediccion=date(2029, 1, 1),
                      valor_predicho=0.72, ci_80_lower=0.65, ci_80_upper=0.79,
                      ci_95_lower=0.61, ci_95_upper=0.83, modelo_version="AutoETS-v1"),
        PrediccionKpi(entidad_tipo="carrera", entidad_id="sem-test", kpi_nombre="D1",
                      horizonte_años=5, fecha_prediccion=date(2031, 1, 1),
                      valor_predicho=0.88, ci_80_lower=0.82, ci_80_upper=0.94,
                      ci_95_lower=0.79, ci_95_upper=0.97, modelo_version="AutoETS-v1"),
    ])
    session.commit()

    response = client.get("/predicciones/carrera/sem-test/semaforo")
    assert response.status_code == 200
    data = response.json()
    assert data["1_año"]["color"] == "verde"   # D1=0.45 < 0.6
    assert data["3_años"]["color"] == "amarillo"  # D1=0.72 entre 0.6 y 0.8
    assert data["5_años"]["color"] == "rojo"   # D1=0.88 > 0.8
```

- [ ] **Step 2: Correr para verificar que falla**

```bash
python -m pytest tests/api/test_predicciones_router.py -v 2>&1 | tail -5
```

Expected: error 404 o ImportError

- [ ] **Step 3: Crear `api/routers/predicciones.py`**

```python
# api/routers/predicciones.py
"""Endpoints del Motor Predictivo P1."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from api.deps import get_db
from pipeline.db.models_predictor import PrediccionKpi

router = APIRouter()

_COLOR_THRESHOLDS = {
    "verde": (0.0, 0.60),
    "amarillo": (0.60, 0.80),
    "rojo": (0.80, 1.01),
}


def _semaforo_color(d1_valor: float) -> str:
    if d1_valor < 0.60:
        return "verde"
    if d1_valor < 0.80:
        return "amarillo"
    return "rojo"


@router.get("/carrera/{carrera_id}")
def get_predicciones_carrera(
    carrera_id: str,
    kpi: Optional[str] = None,
    horizonte: Optional[int] = Query(None, ge=1, le=5),
    db: Session = Depends(get_db),
):
    """Retorna predicciones para una carrera agrupadas por KPI y horizonte."""
    q = db.query(PrediccionKpi).filter_by(entidad_tipo="carrera", entidad_id=carrera_id)
    if kpi:
        q = q.filter(PrediccionKpi.kpi_nombre == kpi.upper())
    if horizonte:
        q = q.filter(PrediccionKpi.horizonte_años == horizonte)

    rows = q.order_by(PrediccionKpi.kpi_nombre, PrediccionKpi.horizonte_años,
                      PrediccionKpi.fecha_prediccion).all()

    # Agrupar por kpi_nombre
    predicciones: dict = {}
    for row in rows:
        key = row.kpi_nombre
        if key not in predicciones:
            predicciones[key] = []
        predicciones[key].append({
            "horizonte_años": row.horizonte_años,
            "fecha_prediccion": str(row.fecha_prediccion),
            "valor_predicho": row.valor_predicho,
            "ci_80_lower": row.ci_80_lower,
            "ci_80_upper": row.ci_80_upper,
            "ci_95_lower": row.ci_95_lower,
            "ci_95_upper": row.ci_95_upper,
            "modelo_version": row.modelo_version,
        })

    return {
        "carrera_id": carrera_id,
        "predicciones": predicciones,
    }


@router.get("/carrera/{carrera_id}/semaforo")
def get_semaforo_carrera(
    carrera_id: str,
    db: Session = Depends(get_db),
):
    """Semáforo predictivo: color verde/amarillo/rojo a 1, 3 y 5 años según D1."""
    result = {}
    for años, label in [(1, "1_año"), (3, "3_años"), (5, "5_años")]:
        pred = (
            db.query(PrediccionKpi)
            .filter_by(
                entidad_tipo="carrera",
                entidad_id=carrera_id,
                kpi_nombre="D1",
                horizonte_años=años,
            )
            .order_by(PrediccionKpi.fecha_prediccion.desc())
            .first()
        )
        if pred:
            color = _semaforo_color(pred.valor_predicho)
            result[label] = {
                "color": color,
                "valor_predicho": pred.valor_predicho,
                "fecha_prediccion": str(pred.fecha_prediccion),
            }
        else:
            result[label] = {"color": "sin_datos", "valor_predicho": None, "fecha_prediccion": None}

    return result
```

- [ ] **Step 4: Registrar router en `api/main.py`**

Leer `api/main.py`. Encontrar donde se registran otros routers (por ejemplo `app.include_router(radar.router, ...)`). Agregar:

```python
from api.routers import predicciones
# ...
app.include_router(predicciones.router, prefix="/predicciones", tags=["predicciones"])
```

- [ ] **Step 5: Correr tests**

```bash
python -m pytest tests/api/test_predicciones_router.py -v
```

Expected: `3 passed`

- [ ] **Step 6: Correr suite completa**

```bash
python -m pytest tests/ -q 2>&1 | tail -3
```

- [ ] **Step 7: Commit**

```bash
git add api/routers/predicciones.py api/main.py tests/api/test_predicciones_router.py
git commit -m "feat(p1): predicciones API - GET /predicciones/carrera/{id} + semáforo"
```

---

## Task 6: Frontend FanChart + Semáforo

**Files:**
- Create: `frontend/src/components/FanChart.tsx`
- Modify: `frontend/src/app/carreras/[id]/page.tsx`
- Modify: `frontend/package.json`

- [ ] **Step 1: Instalar Recharts**

```bash
cd ~/Documents/OIA-EE/frontend && npm install recharts
```

- [ ] **Step 2: Crear `frontend/src/components/FanChart.tsx`**

```typescript
// frontend/src/components/FanChart.tsx
'use client'
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts'

interface PredPoint {
  fecha_prediccion: string
  valor_predicho: number
  ci_80_lower: number | null
  ci_80_upper: number | null
  ci_95_lower: number | null
  ci_95_upper: number | null
}

interface HistPoint {
  fecha: string
  valor: number
}

interface FanChartProps {
  historico: HistPoint[]
  predicciones: PredPoint[]
  kpiNombre: string
  titulo?: string
}

export default function FanChart({ historico, predicciones, kpiNombre, titulo }: FanChartProps) {
  const histData = historico.map(h => ({
    fecha: h.fecha,
    historico: h.valor,
    ci95: null as [number, number] | null,
    ci80: null as [number, number] | null,
    predicho: null as number | null,
  }))

  const predData = predicciones.map(p => ({
    fecha: p.fecha_prediccion,
    historico: null as number | null,
    predicho: p.valor_predicho,
    ci95: p.ci_95_lower != null && p.ci_95_upper != null
      ? [p.ci_95_lower, p.ci_95_upper] as [number, number]
      : null,
    ci80: p.ci_80_lower != null && p.ci_80_upper != null
      ? [p.ci_80_lower, p.ci_80_upper] as [number, number]
      : null,
  }))

  const allData = [...histData, ...predData]

  return (
    <div className="w-full">
      {titulo && <h3 className="text-sm font-medium text-gray-700 mb-2">{titulo}</h3>}
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={allData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="fecha"
            tick={{ fontSize: 11 }}
            tickFormatter={v => v?.slice(0, 7) ?? ''}
          />
          <YAxis
            domain={[0, 1]}
            tickFormatter={v => v.toFixed(1)}
            tick={{ fontSize: 11 }}
          />
          <Tooltip
            formatter={(value: number, name: string) => [value?.toFixed(3), name]}
            labelFormatter={l => `Fecha: ${l}`}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />

          {/* CI 95% — banda más ancha, más translúcida */}
          <Area
            dataKey="ci95"
            fill="#93c5fd"
            stroke="none"
            fillOpacity={0.25}
            name="IC 95%"
            connectNulls={false}
          />
          {/* CI 80% — banda más estrecha */}
          <Area
            dataKey="ci80"
            fill="#3b82f6"
            stroke="none"
            fillOpacity={0.35}
            name="IC 80%"
            connectNulls={false}
          />
          {/* Serie histórica */}
          <Line
            type="monotone"
            dataKey="historico"
            stroke="#64748b"
            strokeWidth={2}
            dot={false}
            name={`${kpiNombre} histórico`}
            connectNulls={false}
          />
          {/* Predicción puntual */}
          <Line
            type="monotone"
            dataKey="predicho"
            stroke="#2563eb"
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={false}
            name={`${kpiNombre} predicho`}
            connectNulls={false}
          />
          {/* Línea de referencia en hoy */}
          <ReferenceLine
            x={new Date().toISOString().slice(0, 10)}
            stroke="#94a3b8"
            strokeDasharray="4 4"
            label={{ value: 'Hoy', position: 'top', fontSize: 11 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 3: Agregar sección predictiva en `/carreras/[id]/page.tsx`**

Leer el archivo actual `frontend/src/app/carreras/[id]/page.tsx`. Encontrar el `return` de la página y agregar la sección predictiva después de los KPI bars existentes.

Agregar este import al inicio del archivo:
```typescript
import FanChart from '@/components/FanChart'
```

Agregar este `fetch` en el componente (junto a los demás fetch de datos):
```typescript
const [predRes] = await Promise.allSettled([
  fetch(`${API_BASE}/predicciones/carrera/${params.id}?kpi=D1`).then(r => r.json()),
])
const predData = predRes.status === 'fulfilled' ? predRes.value : null
const semaforoRes = await fetch(`${API_BASE}/predicciones/carrera/${params.id}/semaforo`)
  .then(r => r.json()).catch(() => null)
```

Agregar esta sección en el JSX (después de los KPI bars existentes):

```tsx
{/* Semáforo Predictivo */}
{semaforoRes && (
  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
    <h2 className="text-lg font-semibold text-gray-800 mb-3">
      Proyección de Riesgo D1
    </h2>
    <div className="flex gap-4">
      {[['1_año', '1 año'], ['3_años', '3 años'], ['5_años', '5 años']].map(([key, label]) => {
        const s = semaforoRes[key]
        const colors: Record<string, string> = {
          verde: 'bg-green-100 text-green-800 border-green-300',
          amarillo: 'bg-yellow-100 text-yellow-800 border-yellow-300',
          rojo: 'bg-red-100 text-red-800 border-red-300',
          sin_datos: 'bg-gray-100 text-gray-500 border-gray-200',
        }
        const icons: Record<string, string> = { verde: '🟢', amarillo: '🟡', rojo: '🔴', sin_datos: '⚫' }
        const cls = colors[s?.color ?? 'sin_datos']
        return (
          <div key={key} className={`flex-1 p-3 rounded border text-center ${cls}`}>
            <div className="text-lg">{icons[s?.color ?? 'sin_datos']}</div>
            <div className="text-sm font-semibold">{label}</div>
            {s?.valor_predicho != null && (
              <div className="text-xs mt-1">D1 = {s.valor_predicho.toFixed(2)}</div>
            )}
          </div>
        )
      })}
    </div>
  </div>
)}

{/* Fan Chart D1 */}
{predData?.predicciones?.D1 && predData.predicciones.D1.length > 0 && (
  <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200">
    <FanChart
      historico={[]}
      predicciones={predData.predicciones.D1}
      kpiNombre="D1"
      titulo="Proyección D1 — Riesgo de Obsolescencia (3 años)"
    />
  </div>
)}
```

- [ ] **Step 4: TypeScript check**

```bash
cd ~/Documents/OIA-EE/frontend && npx tsc --noEmit 2>&1 | grep -v "reporte-pdf" | head -20
```

Expected: 0 errores nuevos (el error de reporte-pdf es preexistente).

- [ ] **Step 5: Correr pytest para verificar que el backend no se rompió**

```bash
cd ~/Documents/OIA-EE && source pipeline/.venv/bin/activate && python -m pytest tests/ -q 2>&1 | tail -3
```

- [ ] **Step 6: Commit**

```bash
cd ~/Documents/OIA-EE && git add frontend/src/components/FanChart.tsx \
  frontend/src/app/carreras/[id]/page.tsx \
  frontend/package.json frontend/package-lock.json
git commit -m "feat(p1): FanChart component + semáforo predictivo en /carreras/[id]"
```

---

## Variables de entorno requeridas por P1

Sin nuevas variables — statsforecast corre localmente. Las existentes son suficientes.

---

## Self-Review del Plan P1

**Cobertura del spec P1:**
- ✅ 1.1 Forecasting (statsforecast AutoETS, `predicciones_kpi`, job semanal) — Task 1+2+4
- ✅ 1.2 Motor de demanda de habilidades (skills_aggregator, actualiza `skills_emergentes`) — Task 3+4
- ⚠️ 1.3 Índice de riesgo dinámico (D1 mejorado con datos del Radar) — **fuera de scope de este plan** (requiere lógica compleja en D1 engine; se incluirá en P1b)
- ✅ 1.4 Dashboard predictivo (FanChart + semáforo 1/3/5 años) — Task 6
- ⚠️ 1.4 Exportación PNG/SVG/CSV de gráfica — fuera de scope (YAGNI para MVP)
- ⚠️ 1.5 Backtesting automático (MAPE/RMSE) — fuera de scope (se implementa tras acumular predicciones vs realidad, sprint siguiente)

**Placeholder scan:** Ningún TBD. Todos los steps tienen código completo.

**Consistencia de tipos:**
- `PredRow.fecha_prediccion: date` → se convierte a `str` en la API response
- `PrediccionKpi.horizonte_años: int` → `_HORIZONTES` dict en forecast_job usa `{1: 4, 3: 12, 5: 20}`
- `_semaforo_color(d1_valor)` usa thresholds 0.60/0.80 — consistentes en router y tests
- `aggregate_skills_from_vacantes` retorna `int` (count de skills únicos) — tests verifican `> 0`

**Dependencias entre tasks:**
- Task 2 (forecaster) → Task 4 (job) → depende de Task 1 (modelo DB)
- Task 3 (skills) → Task 4 (job)
- Task 5 (API) → depende de Task 1 (modelo) + Task 4 (jobs registrados en main.py)
- Task 6 (frontend) → depende de Task 5 (endpoint existe)

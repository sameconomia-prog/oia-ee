# Sprint 6 — Alertas Persistentes con Historial Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persistir alertas KPI en la tabla `alertas` de PostgreSQL mediante un job nightly, exponer historial por IES con capacidad de marcar como leída, y actualizar AlertasPanel con tabs "Actuales" / "Historial".

**Architecture:** `pipeline/jobs/alert_job.py` calcula KPIs para todas las carreras de todas las IES y persiste alertas en DB (con deduplicación 24h). Dos nuevos endpoints: `GET /alertas` (historial paginado) y `PUT /alertas/{id}/leer`. AlertasPanel añade un tab de historial que hace fetch desde la API, con botón "✓ Leída" por fila. El scheduler APScheduler (ya instalado) se activa solo con `ENABLE_SCHEDULER=true`.

**Tech Stack:** FastAPI · SQLAlchemy · APScheduler 3.10.4 · pytest · Next.js 14 · TypeScript · Jest 29 · React Testing Library

---

## Mapa de archivos

**Nuevos:**
- `pipeline/jobs/__init__.py` — vacío, hace del directorio un paquete Python
- `pipeline/jobs/alert_job.py` — función `run_alert_job(db)` con deduplicación
- `api/routers/alertas.py` — `GET /alertas` y `PUT /alertas/{id}/leer`
- `tests/jobs/__init__.py` — vacío
- `tests/jobs/test_alert_job.py` — 2 tests (unit del job)
- `tests/api/test_alertas.py` — 4 tests (endpoints alertas)

**Modificados:**
- `api/schemas.py` — +AlertaDBOut, AlertasHistorialOut, AlertaLeidaOut
- `api/main.py` — registra alertas router, añade scheduler startup/shutdown
- `api/routers/admin.py` — +POST /admin/jobs/alertas (trigger manual)
- `frontend/src/lib/types.ts` — +AlertaDB, AlertasHistorial
- `frontend/src/lib/api.ts` — +getAlertas, markAlertaRead; fix getRectorData param type
- `frontend/__tests__/api.test.ts` — +3 tests (getAlertas, markAlertaRead, fix getRectorData)
- `frontend/src/components/AlertasPanel.tsx` — +tabs Actuales/Historial, marcar leída
- `frontend/src/components/RectorDashboard.tsx` — pasa iesId a AlertasPanel
- `frontend/__tests__/AlertasPanel.test.tsx` — actualiza renders +iesId, +2 tests nuevos

---

## Task 1: Alert Job — pipeline/jobs/alert_job.py

**Files:**
- Create: `pipeline/jobs/__init__.py`
- Create: `pipeline/jobs/alert_job.py`
- Create: `tests/jobs/__init__.py`
- Create: `tests/jobs/test_alert_job.py`

### Context para el implementador

El proyecto está en `/Users/arturoaguilar/Documents/OIA-EE`. El conftest raíz está en `tests/conftest.py` y define los fixtures `engine` (session-scope) y `session` (function-scope) que usan SQLite en memoria. Los modelos de DB están en `pipeline/db/models.py`. La función `run_kpis(carrera_id, db)` está en `pipeline/kpi_engine/kpi_runner.py` — para que retorne KPIs con D1 > 0.7, la carrera debe tener `onet_codes_relacionados` apuntando a una `Ocupacion` con `p_automatizacion >= 0.95` (como en `tests/api/test_rector.py`). La tabla `Alerta` tiene campos: id (UUID default), ies_id, carrera_id, tipo, severidad, titulo, mensaje, accion_sugerida, fecha (DateTime UTC), leida (Boolean default False).

- [ ] **Step 1: Crear archivos `__init__.py` vacíos**

```bash
mkdir -p pipeline/jobs tests/jobs
touch pipeline/jobs/__init__.py tests/jobs/__init__.py
```

- [ ] **Step 2: Escribir los tests fallidos**

Crea `tests/jobs/test_alert_job.py`:

```python
# tests/jobs/test_alert_job.py
import json
from pipeline.db.models import IES, Carrera, CarreraIES, Ocupacion, Alerta
from pipeline.jobs.alert_job import run_alert_job


def test_alert_job_persiste_alerta_d1_alto(session):
    ies = IES(nombre="IES Job Test", nombre_corto="IJT")
    session.add(ies)
    occ = Ocupacion(onet_code="55-5555.55", nombre="Ocup Alta Auto", p_automatizacion=0.95)
    session.add(occ)
    session.flush()

    carrera = Carrera(
        nombre_norm="Carrera Alta Auto",
        onet_codes_relacionados=json.dumps(["55-5555.55"]),
    )
    session.add(carrera)
    session.flush()

    cie = CarreraIES(
        carrera_id=carrera.id,
        ies_id=ies.id,
        ciclo="2024/2",
        matricula=100,
        egresados=20,
        plan_estudio_skills=json.dumps([]),
    )
    session.add(cie)
    session.flush()

    creadas = run_alert_job(session)

    alertas = session.query(Alerta).filter_by(ies_id=ies.id).all()
    assert creadas >= 1
    assert len(alertas) >= 1
    assert alertas[0].tipo in ("d1_alto", "ambos")
    assert alertas[0].severidad in ("alta", "media")


def test_alert_job_no_duplica_alertas(session):
    ies = IES(nombre="IES No Dup", nombre_corto="IND")
    session.add(ies)
    occ = Ocupacion(onet_code="66-6666.66", nombre="Ocup NoDup", p_automatizacion=0.95)
    session.add(occ)
    session.flush()

    carrera = Carrera(
        nombre_norm="Carrera NoDup",
        onet_codes_relacionados=json.dumps(["66-6666.66"]),
    )
    session.add(carrera)
    session.flush()

    cie = CarreraIES(
        carrera_id=carrera.id,
        ies_id=ies.id,
        ciclo="2024/2",
        matricula=80,
        egresados=16,
        plan_estudio_skills=json.dumps([]),
    )
    session.add(cie)
    session.flush()

    run_alert_job(session)
    run_alert_job(session)

    alertas = session.query(Alerta).filter_by(ies_id=ies.id).all()
    assert len(alertas) == 1, f"Expected 1 alerta, got {len(alertas)} (deduplication failed)"
```

- [ ] **Step 3: Verificar que los tests fallan**

```bash
pytest tests/jobs/test_alert_job.py -v
```

Expected: `ImportError: cannot import name 'run_alert_job'` o `ModuleNotFoundError`.

- [ ] **Step 4: Implementar `pipeline/jobs/alert_job.py`**

```python
# pipeline/jobs/alert_job.py
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from pipeline.db.models import IES, CarreraIES, Carrera, Alerta
from pipeline.kpi_engine.kpi_runner import run_kpis

_WINDOW_HORAS = 24

_TITULOS = {
    "d1_alto": "D1 crítico",
    "d2_bajo": "D2 bajo",
    "ambos": "D1 crítico y D2 bajo",
}


def _ya_existe(db: Session, ies_id: str, carrera_id: str, tipo: str) -> bool:
    cutoff = datetime.utcnow() - timedelta(hours=_WINDOW_HORAS)
    return (
        db.query(Alerta)
        .filter(
            Alerta.ies_id == ies_id,
            Alerta.carrera_id == carrera_id,
            Alerta.tipo == tipo,
            Alerta.fecha >= cutoff,
        )
        .first()
    ) is not None


def run_alert_job(db: Session) -> int:
    """Persiste alertas KPI para todas las IES. Retorna número de alertas creadas."""
    creadas = 0
    for ies in db.query(IES).all():
        for cie in db.query(CarreraIES).filter_by(ies_id=ies.id).all():
            kpi = run_kpis(cie.carrera_id, db)
            if not kpi:
                continue
            d1 = kpi.d1_obsolescencia.score
            d2 = kpi.d2_oportunidades.score
            d1_alert = d1 > 0.7
            d2_alert = d2 < 0.4
            if not (d1_alert or d2_alert):
                continue
            tipo = "ambos" if (d1_alert and d2_alert) else ("d1_alto" if d1_alert else "d2_bajo")
            if _ya_existe(db, ies.id, cie.carrera_id, tipo):
                continue
            severidad = "alta" if (d1 > 0.8 or d2 < 0.3) else "media"
            db.add(
                Alerta(
                    ies_id=ies.id,
                    carrera_id=cie.carrera_id,
                    tipo=tipo,
                    severidad=severidad,
                    titulo=_TITULOS[tipo],
                    mensaje=f"D1 = {d1:.2f} (umbral: 0.70) · D2 = {d2:.2f} (umbral: 0.40)",
                )
            )
            creadas += 1
    db.commit()
    return creadas
```

- [ ] **Step 5: Verificar que los tests pasan**

```bash
pytest tests/jobs/test_alert_job.py -v
```

Expected:
```
PASSED tests/jobs/test_alert_job.py::test_alert_job_persiste_alerta_d1_alto
PASSED tests/jobs/test_alert_job.py::test_alert_job_no_duplica_alertas
2 passed
```

- [ ] **Step 6: Commit**

```bash
git add pipeline/jobs/__init__.py pipeline/jobs/alert_job.py tests/jobs/__init__.py tests/jobs/test_alert_job.py
git commit -m "feat(jobs): alert_job persiste alertas KPI con deduplicación 24h"
```

---

## Task 2: Schemas + Alertas Router + Tests

**Files:**
- Modify: `api/schemas.py`
- Create: `api/routers/alertas.py`
- Create: `tests/api/test_alertas.py`

### Context para el implementador

El proyecto está en `/Users/arturoaguilar/Documents/OIA-EE`. El router sigue el patrón de `api/routers/rector.py`. Los tests de API usan los fixtures `client` y `db_session` definidos en `tests/api/conftest.py` (TestClient con SQLite en memoria, override de `get_db`). El modelo `Alerta` tiene el campo `leida` como `Boolean(default=False)`. El campo `fecha` es `DateTime(timezone=True)` con default `datetime.utcnow`.

El router se registra en `api/main.py` con prefix `/alertas` — eso se hace en Task 3. Este task solo crea el router y los tests.

- [ ] **Step 1: Añadir schemas en `api/schemas.py`**

Añade al final del archivo:

```python
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
```

- [ ] **Step 2: Escribir tests fallidos**

Crea `tests/api/test_alertas.py`:

```python
# tests/api/test_alertas.py
import json
from pipeline.db.models import IES, Carrera, CarreraIES, Alerta


def test_get_alertas_vacio(client, db_session):
    ies = IES(nombre="IES Sin Alertas", nombre_corto="ISA")
    db_session.add(ies)
    db_session.flush()

    resp = client.get(f"/alertas?ies_id={ies.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["alertas"] == []
    assert data["total"] == 0


def test_get_alertas_retorna_datos(client, db_session):
    ies = IES(nombre="IES Con Alertas", nombre_corto="ICA")
    db_session.add(ies)
    carrera = Carrera(nombre_norm="Carrera Con Alerta", onet_codes_relacionados=json.dumps([]))
    db_session.add(carrera)
    db_session.flush()

    alerta = Alerta(
        ies_id=ies.id,
        carrera_id=carrera.id,
        tipo="d1_alto",
        severidad="alta",
        titulo="D1 crítico",
        mensaje="D1 = 0.85 (umbral: 0.70) · D2 = 0.50 (umbral: 0.40)",
    )
    db_session.add(alerta)
    db_session.flush()

    resp = client.get(f"/alertas?ies_id={ies.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert len(data["alertas"]) == 1
    a = data["alertas"][0]
    assert a["carrera_nombre"] == "Carrera Con Alerta"
    assert a["tipo"] == "d1_alto"
    assert a["severidad"] == "alta"
    assert a["leida"] is False


def test_marcar_alerta_leida(client, db_session):
    ies = IES(nombre="IES Leer", nombre_corto="IL")
    db_session.add(ies)
    carrera = Carrera(nombre_norm="Carrera Leer", onet_codes_relacionados=json.dumps([]))
    db_session.add(carrera)
    db_session.flush()

    alerta = Alerta(
        ies_id=ies.id,
        carrera_id=carrera.id,
        tipo="d2_bajo",
        severidad="media",
        titulo="D2 bajo",
    )
    db_session.add(alerta)
    db_session.flush()

    resp = client.put(f"/alertas/{alerta.id}/leer")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == alerta.id
    assert data["leida"] is True


def test_marcar_alerta_inexistente(client):
    resp = client.put("/alertas/id-no-existe/leer")
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Alerta no encontrada"
```

- [ ] **Step 3: Verificar que los tests fallan**

```bash
pytest tests/api/test_alertas.py -v
```

Expected: `404 Not Found` en todos porque el router no existe aún.

- [ ] **Step 4: Implementar `api/routers/alertas.py`**

```python
# api/routers/alertas.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from api.deps import get_db
from api.schemas import AlertaDBOut, AlertasHistorialOut, AlertaLeidaOut
from pipeline.db.models import Alerta, Carrera

router = APIRouter()


@router.get("/", response_model=AlertasHistorialOut)
def get_alertas(
    ies_id: str,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    total = db.query(Alerta).filter_by(ies_id=ies_id).count()
    alertas = (
        db.query(Alerta)
        .filter_by(ies_id=ies_id)
        .order_by(Alerta.leida.asc(), Alerta.fecha.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    result = []
    for a in alertas:
        carrera = db.query(Carrera).filter_by(id=a.carrera_id).first()
        result.append(
            AlertaDBOut(
                id=a.id,
                ies_id=a.ies_id,
                carrera_id=a.carrera_id,
                carrera_nombre=carrera.nombre_norm if carrera else "—",
                tipo=a.tipo,
                severidad=a.severidad,
                titulo=a.titulo,
                mensaje=a.mensaje,
                fecha=a.fecha.isoformat() if a.fecha else "",
                leida=bool(a.leida),
            )
        )
    return AlertasHistorialOut(alertas=result, total=total)


@router.put("/{alerta_id}/leer", response_model=AlertaLeidaOut)
def marcar_leida(alerta_id: str, db: Session = Depends(get_db)):
    alerta = db.query(Alerta).filter_by(id=alerta_id).first()
    if not alerta:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")
    alerta.leida = True
    db.commit()
    return AlertaLeidaOut(id=alerta.id, leida=bool(alerta.leida))
```

- [ ] **Step 5: Registrar el router en `api/main.py` temporalmente para los tests**

Modifica `api/main.py`:

```python
# api/main.py
from fastapi import FastAPI
from api.routers import noticias, kpis, admin, rector, alertas

app = FastAPI(title="OIA-EE API", version="0.5.0")
app.include_router(noticias.router, prefix="/noticias", tags=["noticias"])
app.include_router(kpis.router, prefix="/kpis", tags=["kpis"])
app.include_router(admin.router, prefix="/admin", tags=["admin"])
app.include_router(rector.router, prefix="/rector", tags=["rector"])
app.include_router(alertas.router, prefix="/alertas", tags=["alertas"])


@app.get("/health")
def health():
    return {"status": "ok"}
```

- [ ] **Step 6: Verificar que los tests pasan**

```bash
pytest tests/api/test_alertas.py -v
```

Expected:
```
PASSED tests/api/test_alertas.py::test_get_alertas_vacio
PASSED tests/api/test_alertas.py::test_get_alertas_retorna_datos
PASSED tests/api/test_alertas.py::test_marcar_alerta_leida
PASSED tests/api/test_alertas.py::test_marcar_alerta_inexistente
4 passed
```

- [ ] **Step 7: Verificar que todos los tests backend pasan**

```bash
pytest tests/api/ tests/jobs/ -v
```

Expected: 7 passed (3 rector + 4 alertas + 2 jobs — los jobs se corren por separado pero todos verdes).

- [ ] **Step 8: Commit**

```bash
git add api/schemas.py api/routers/alertas.py api/main.py tests/api/test_alertas.py
git commit -m "feat(alertas): GET /alertas historial paginado y PUT /alertas/{id}/leer"
```

---

## Task 3: Scheduler + Admin Trigger

**Files:**
- Modify: `api/main.py` — añadir scheduler APScheduler
- Modify: `api/routers/admin.py` — añadir POST /admin/jobs/alertas

### Context para el implementador

El proyecto está en `/Users/arturoaguilar/Documents/OIA-EE`. `api/main.py` ya incluye el router de alertas (Task 2). Ahora hay que añadir el scheduler APScheduler. APScheduler ya está instalado (`apscheduler==3.10.4`). El scheduler solo arranca si `ENABLE_SCHEDULER=true` en las variables de entorno — esto evita que se active en tests. `pipeline/db/__init__.py` exporta `get_session` como context manager que hace commit/rollback/close automáticamente. El endpoint de admin trigger sigue el patrón de `POST /admin/ingest/gdelt` con header `X-Admin-Key`.

- [ ] **Step 1: Actualizar `api/main.py` con scheduler**

```python
# api/main.py
import os
from fastapi import FastAPI
from apscheduler.schedulers.background import BackgroundScheduler
from api.routers import noticias, kpis, admin, rector, alertas
from pipeline.db import get_session
from pipeline.jobs.alert_job import run_alert_job

app = FastAPI(title="OIA-EE API", version="0.5.0")
app.include_router(noticias.router, prefix="/noticias", tags=["noticias"])
app.include_router(kpis.router, prefix="/kpis", tags=["kpis"])
app.include_router(admin.router, prefix="/admin", tags=["admin"])
app.include_router(rector.router, prefix="/rector", tags=["rector"])
app.include_router(alertas.router, prefix="/alertas", tags=["alertas"])

_scheduler = BackgroundScheduler()


def _run_alert_job_scheduled() -> None:
    with get_session() as db:
        run_alert_job(db)


@app.on_event("startup")
def _startup() -> None:
    if os.getenv("ENABLE_SCHEDULER", "false").lower() == "true":
        _scheduler.add_job(_run_alert_job_scheduled, "cron", hour=3, minute=0)
        _scheduler.start()


@app.on_event("shutdown")
def _shutdown() -> None:
    if _scheduler.running:
        _scheduler.shutdown()


@app.get("/health")
def health():
    return {"status": "ok"}
```

- [ ] **Step 2: Añadir trigger manual en `api/routers/admin.py`**

Añade al final de `api/routers/admin.py`:

```python
from api.deps import get_db
from pipeline.jobs.alert_job import run_alert_job
from sqlalchemy.orm import Session


class AlertJobResultOut(BaseModel):
    alertas_creadas: int


@router.post("/jobs/alertas", response_model=AlertJobResultOut)
def trigger_alert_job(
    x_admin_key: str = Header(None),
    db: Session = Depends(get_db),
):
    admin_key = os.getenv("ADMIN_API_KEY", "")
    if not admin_key or x_admin_key != admin_key:
        raise HTTPException(status_code=401, detail="Unauthorized")
    creadas = run_alert_job(db)
    return AlertJobResultOut(alertas_creadas=creadas)
```

**Nota:** `get_db`, `Session`, `Depends` ya están importados en `admin.py`. Solo necesitas añadir `run_alert_job` y `AlertJobResultOut`.

El archivo completo de `api/routers/admin.py` debe quedar:

```python
# api/routers/admin.py
import os
import logging
from fastapi import APIRouter, Header, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from api.deps import get_db
from pipeline.ingest_gdelt import run_gdelt_pipeline
from pipeline.jobs.alert_job import run_alert_job

logger = logging.getLogger(__name__)
router = APIRouter()


class IngestResultOut(BaseModel):
    fetched: int
    stored: int
    classified: int
    embedded: int


class AlertJobResultOut(BaseModel):
    alertas_creadas: int


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


@router.post("/jobs/alertas", response_model=AlertJobResultOut)
def trigger_alert_job(
    x_admin_key: str = Header(None),
    db: Session = Depends(get_db),
):
    admin_key = os.getenv("ADMIN_API_KEY", "")
    if not admin_key or x_admin_key != admin_key:
        raise HTTPException(status_code=401, detail="Unauthorized")
    creadas = run_alert_job(db)
    return AlertJobResultOut(alertas_creadas=creadas)
```

- [ ] **Step 3: Verificar que todos los tests backend pasan**

```bash
pytest tests/api/ tests/jobs/ -v
```

Expected: todos los tests pasan (no se rompe nada con los cambios en main.py y admin.py).

- [ ] **Step 4: Commit**

```bash
git add api/main.py api/routers/admin.py
git commit -m "feat(scheduler): APScheduler nightly job + POST /admin/jobs/alertas trigger"
```

---

## Task 4: TypeScript Types + API Client + Tests

**Files:**
- Modify: `frontend/src/lib/types.ts`
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/__tests__/api.test.ts`

### Context para el implementador

El proyecto está en `/Users/arturoaguilar/Documents/OIA-EE`. El worktree (si aplica) está en `.worktrees/sprint6-alertas`. Los archivos frontend están en `frontend/`. El archivo `frontend/__tests__/api.test.ts` usa un `mockFetch` global y tiene un `beforeEach(() => mockFetch.mockReset())`. Los tests existentes de `getRectorData` pasan `1` y `99` (number) — deben actualizarse a `"1"` y `"99"` (string) porque `getRectorData` ya acepta `string` desde Sprint 5.

- [ ] **Step 1: Añadir interfaces a `frontend/src/lib/types.ts`**

Añade al final del archivo:

```typescript
export interface AlertaDB {
  id: string
  ies_id: string
  carrera_id: string
  carrera_nombre: string
  tipo: 'd1_alto' | 'd2_bajo' | 'ambos'
  severidad: 'alta' | 'media'
  titulo: string
  mensaje: string | null
  fecha: string
  leida: boolean
}

export interface AlertasHistorial {
  alertas: AlertaDB[]
  total: number
}
```

- [ ] **Step 2: Añadir funciones a `frontend/src/lib/api.ts`**

Añade al final del archivo (después de `getRectorData`):

```typescript
export async function getAlertas(
  iesId: string,
  options: { skip?: number; limit?: number } = {}
): Promise<AlertasHistorial> {
  const q = new URLSearchParams({ ies_id: iesId })
  if (options.skip !== undefined) q.set('skip', String(options.skip))
  if (options.limit !== undefined) q.set('limit', String(options.limit))
  const res = await fetch(`${BASE}/alertas?${q}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

export async function markAlertaRead(alertaId: string): Promise<void> {
  const res = await fetch(`${BASE}/alertas/${alertaId}/leer`, { method: 'PUT' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}
```

También actualiza el import de tipos al inicio para incluir `AlertasHistorial`:

```typescript
import type { Noticia, KpiResult, IngestResult, RectorData, AlertasHistorial } from './types'
```

- [ ] **Step 3: Escribir tests para las nuevas funciones en `frontend/__tests__/api.test.ts`**

Añade al final del archivo (después del describe `getRectorData`):

```typescript
describe('getRectorData (type fix)', () => {
  it('acepta string como iesId', async () => {
    const mockData = { ies: { id: '1', nombre: 'Test', nombre_corto: null }, carreras: [], alertas: [] }
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mockData } as Response)
    const result = await getRectorData('1')
    expect(result.ies.nombre).toBe('Test')
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('ies_id=1'))
  })
})

describe('getAlertas', () => {
  it('retorna AlertasHistorial en éxito', async () => {
    const mockData: AlertasHistorial = { alertas: [], total: 0 }
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mockData } as Response)
    const result = await getAlertas('ies-abc')
    expect(result.total).toBe(0)
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('ies_id=ies-abc'))
  })

  it('lanza error en respuesta no-OK', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 } as Response)
    await expect(getAlertas('ies-abc')).rejects.toThrow('HTTP 500')
  })
})

describe('markAlertaRead', () => {
  it('envía PUT y resuelve sin error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) } as Response)
    await expect(markAlertaRead('alerta-1')).resolves.toBeUndefined()
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/alertas/alerta-1/leer'),
      { method: 'PUT' }
    )
  })
})
```

También añade `getAlertas, markAlertaRead, AlertasHistorial` al import del inicio del archivo:

```typescript
import { getNoticias, getKpis, postIngestGdelt, getRectorData, getAlertas, markAlertaRead } from '@/lib/api'
import type { AlertasHistorial } from '@/lib/types'
```

Y corrige los tests existentes de `getRectorData` que usan `number`:

```typescript
// En describe('getRectorData'), cambia:
const result = await getRectorData(1)    // → getRectorData('1')
await expect(getRectorData(99)).rejects  // → getRectorData('99')
```

- [ ] **Step 4: Verificar que los tests pasan**

```bash
cd frontend && npm test -- __tests__/api.test.ts
```

Expected:
```
PASS __tests__/api.test.ts
Tests: N passed
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/types.ts frontend/src/lib/api.ts frontend/__tests__/api.test.ts
git commit -m "feat(frontend): AlertaDB types + getAlertas/markAlertaRead API client"
```

---

## Task 5: AlertasPanel + RectorDashboard + Tests

**Files:**
- Modify: `frontend/src/components/AlertasPanel.tsx`
- Modify: `frontend/src/components/RectorDashboard.tsx`
- Modify: `frontend/__tests__/AlertasPanel.test.tsx`

### Context para el implementador

El proyecto está en `/Users/arturoaguilar/Documents/OIA-EE`. `AlertasPanel` actualmente recibe solo `{ alertas: AlertaItem[] }`. En este task se añade `iesId: string` a sus props y se añaden tabs "Actuales" / "Historial". El tab "Historial" hace fetch llamando `getAlertas(iesId)` en un `useEffect`. Los 3 tests existentes en `AlertasPanel.test.tsx` usan `<AlertasPanel alertas={[...]} />` sin `iesId` — deben actualizarse a `<AlertasPanel alertas={[...]} iesId="test-ies" />`. Los 2 tests nuevos deben mockear `@/lib/api`. `RectorDashboard` actualmente pasa `alertas={data.alertas}` a `AlertasPanel` — hay que añadir `iesId={iesId}`.

- [ ] **Step 1: Actualizar tests existentes y escribir tests nuevos en `frontend/__tests__/AlertasPanel.test.tsx`**

Reemplaza el contenido completo del archivo:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AlertasPanel from '@/components/AlertasPanel'
import type { AlertaItem } from '@/lib/types'
import * as api from '@/lib/api'

jest.mock('@/lib/api')
const mockGetAlertas = api.getAlertas as jest.MockedFunction<typeof api.getAlertas>
const mockMarkAlertaRead = api.markAlertaRead as jest.MockedFunction<typeof api.markAlertaRead>

beforeEach(() => {
  mockGetAlertas.mockReset()
  mockMarkAlertaRead.mockReset()
})

const alertaMock: AlertaItem = {
  id: 'a1',
  carrera_nombre: 'Derecho',
  tipo: 'ambos',
  severidad: 'alta',
  titulo: 'D1 crítico y D2 bajo',
  mensaje: 'D1 = 0.82 · D2 = 0.35',
  fecha: '2026-04-21T00:00:00',
}

test('muestra alerta con severidad y carrera_nombre', () => {
  render(<AlertasPanel alertas={[alertaMock]} iesId="test-ies" />)
  expect(screen.getByText('Derecho')).toBeInTheDocument()
  expect(screen.getByText('alta')).toBeInTheDocument()
  expect(screen.getByText('D1 alto + D2 bajo')).toBeInTheDocument()
})

test('muestra mensaje vacío cuando no hay alertas', () => {
  render(<AlertasPanel alertas={[]} iesId="test-ies" />)
  expect(screen.getByText(/Sin alertas activas/)).toBeInTheDocument()
})

test('ordena alertas con alta primero', () => {
  const media: AlertaItem = {
    id: 'b1',
    carrera_nombre: 'Contabilidad',
    tipo: 'd2_bajo',
    severidad: 'media',
    titulo: 'D2 bajo',
    mensaje: null,
    fecha: '2026-04-21T00:00:00',
  }
  const { container } = render(<AlertasPanel alertas={[media, alertaMock]} iesId="test-ies" />)
  const text = container.textContent ?? ''
  expect(text.indexOf('Derecho')).toBeLessThan(text.indexOf('Contabilidad'))
})

test('muestra tab historial y carga alertas desde DB', async () => {
  mockGetAlertas.mockResolvedValue({
    alertas: [
      {
        id: 'db1',
        ies_id: 'test-ies',
        carrera_id: 'c1',
        carrera_nombre: 'Medicina',
        tipo: 'd2_bajo' as const,
        severidad: 'media' as const,
        titulo: 'D2 bajo',
        mensaje: null,
        fecha: '2026-04-21T03:00:00',
        leida: false,
      },
    ],
    total: 1,
  })
  render(<AlertasPanel alertas={[]} iesId="test-ies" />)
  fireEvent.click(screen.getByText(/Historial/))
  await waitFor(() => expect(screen.getByText('Medicina')).toBeInTheDocument())
  expect(mockGetAlertas).toHaveBeenCalledWith('test-ies')
})

test('botón Leída llama markAlertaRead', async () => {
  mockGetAlertas.mockResolvedValue({
    alertas: [
      {
        id: 'db1',
        ies_id: 'test-ies',
        carrera_id: 'c1',
        carrera_nombre: 'Medicina',
        tipo: 'd2_bajo' as const,
        severidad: 'media' as const,
        titulo: 'D2 bajo',
        mensaje: null,
        fecha: '2026-04-21T03:00:00',
        leida: false,
      },
    ],
    total: 1,
  })
  mockMarkAlertaRead.mockResolvedValue(undefined)
  render(<AlertasPanel alertas={[]} iesId="test-ies" />)
  fireEvent.click(screen.getByText(/Historial/))
  await waitFor(() => screen.getByText('✓ Leída'))
  fireEvent.click(screen.getByText('✓ Leída'))
  await waitFor(() => expect(mockMarkAlertaRead).toHaveBeenCalledWith('db1'))
})
```

- [ ] **Step 2: Verificar que los tests fallan por la prop faltante `iesId`**

```bash
cd frontend && npm test -- __tests__/AlertasPanel.test.tsx
```

Expected: TypeScript error o test falla porque AlertasPanel no acepta `iesId`.

- [ ] **Step 3: Reemplazar `frontend/src/components/AlertasPanel.tsx`**

```tsx
'use client'
import { useState, useEffect } from 'react'
import type { AlertaItem, AlertaDB } from '@/lib/types'
import { getAlertas, markAlertaRead } from '@/lib/api'

const TIPO_LABELS: Record<string, string> = {
  d1_alto: 'D1 alto',
  d2_bajo: 'D2 bajo',
  ambos: 'D1 alto + D2 bajo',
}

export default function AlertasPanel({
  alertas,
  iesId,
}: {
  alertas: AlertaItem[]
  iesId: string
}) {
  const [tab, setTab] = useState<'actuales' | 'historial'>('actuales')
  const [historial, setHistorial] = useState<AlertaDB[]>([])
  const [histLoading, setHistLoading] = useState(false)

  useEffect(() => {
    if (tab !== 'historial') return
    setHistLoading(true)
    getAlertas(iesId)
      .then((data) => setHistorial(data.alertas))
      .catch(() => setHistorial([]))
      .finally(() => setHistLoading(false))
  }, [tab, iesId])

  const handleMarkRead = async (id: string) => {
    await markAlertaRead(id)
    setHistorial((prev) =>
      prev.map((a) => (a.id === id ? { ...a, leida: true } : a))
    )
  }

  const sorted = [...alertas].sort((a, b) =>
    a.severidad === 'alta' && b.severidad !== 'alta' ? -1 : 1
  )

  return (
    <div>
      <div className="flex border-b border-gray-200 text-xs font-medium">
        <button
          onClick={() => setTab('actuales')}
          className={`px-3 py-2 ${
            tab === 'actuales'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Actuales ({alertas.length})
        </button>
        <button
          onClick={() => setTab('historial')}
          className={`px-3 py-2 ${
            tab === 'historial'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Historial
        </button>
      </div>

      {tab === 'actuales' && (
        <div className="flex flex-col gap-2 p-3">
          {alertas.length === 0 ? (
            <div className="text-sm text-green-600 flex items-center gap-2">
              <span>✓</span>
              <span>Sin alertas activas</span>
            </div>
          ) : (
            sorted.map((a) => (
              <div
                key={a.id}
                className={`rounded border p-2.5 text-xs ${
                  a.severidad === 'alta'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-yellow-50 border-yellow-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-gray-800">{a.carrera_nombre}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                      a.severidad === 'alta'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {a.severidad}
                  </span>
                </div>
                <div className="text-gray-600">{TIPO_LABELS[a.tipo] ?? a.tipo}</div>
                {a.mensaje && <div className="text-gray-500 mt-1">{a.mensaje}</div>}
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'historial' && (
        <div className="flex flex-col gap-2 p-3">
          {histLoading ? (
            <p className="text-xs text-gray-400">Cargando historial...</p>
          ) : historial.length === 0 ? (
            <p className="text-xs text-gray-400">Sin alertas registradas</p>
          ) : (
            historial.map((a) => (
              <div
                key={a.id}
                className={`rounded border p-2.5 text-xs flex items-start justify-between gap-2 ${
                  a.leida ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-red-50 border-red-200'
                }`}
              >
                <div>
                  <div className="font-semibold text-gray-800">{a.carrera_nombre}</div>
                  <div className="text-gray-600">{TIPO_LABELS[a.tipo] ?? a.tipo}</div>
                  {a.mensaje && <div className="text-gray-500 mt-0.5">{a.mensaje}</div>}
                </div>
                {!a.leida && (
                  <button
                    onClick={() => handleMarkRead(a.id)}
                    className="shrink-0 text-xs text-blue-600 hover:text-blue-800 whitespace-nowrap"
                  >
                    ✓ Leída
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Actualizar `frontend/src/components/RectorDashboard.tsx`**

Cambia la línea que renderiza AlertasPanel para pasar `iesId`:

```tsx
<AlertasPanel alertas={data.alertas} iesId={iesId} />
```

El archivo completo de `frontend/src/components/RectorDashboard.tsx` debe quedar:

```tsx
'use client'
import { useEffect, useState } from 'react'
import { getRectorData } from '@/lib/api'
import type { RectorData } from '@/lib/types'
import AlertasPanel from './AlertasPanel'
import RectorCarrerasTable from './RectorCarrerasTable'

export default function RectorDashboard({ iesId }: { iesId: string }) {
  const [data, setData] = useState<RectorData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getRectorData(iesId)
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Error'))
      .finally(() => setLoading(false))
  }, [iesId])

  if (loading) return <p className="text-gray-400 py-8">Cargando dashboard...</p>
  if (error) return <p className="text-red-500 py-8">Error: {error}</p>
  if (!data) return <p className="text-gray-400 py-8">Sin datos disponibles.</p>

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-800">{data.ies.nombre}</h2>
        {data.ies.nombre_corto && (
          <p className="text-sm text-gray-500">{data.ies.nombre_corto}</p>
        )}
      </div>
      <div className="grid grid-cols-[280px_1fr] gap-4 items-start">
        <aside className="border rounded bg-white">
          <AlertasPanel alertas={data.alertas} iesId={iesId} />
        </aside>
        <main>
          <RectorCarrerasTable carreras={data.carreras} />
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Verificar que todos los tests frontend pasan**

```bash
cd frontend && npm test -- --passWithNoTests
```

Expected:
```
PASS __tests__/AlertasPanel.test.tsx   (5 tests)
PASS __tests__/RectorDashboard.test.tsx (3 tests)
PASS __tests__/api.test.ts             (N tests)
PASS __tests__/KpisTable.test.tsx
PASS __tests__/NoticiasTable.test.tsx
PASS __tests__/AdminPanel.test.tsx
Tests: 27+ passed
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/AlertasPanel.tsx frontend/src/components/RectorDashboard.tsx frontend/__tests__/AlertasPanel.test.tsx
git commit -m "feat(frontend): AlertasPanel tabs Actuales/Historial con marcar leída"
```

---

## Self-Review

**Spec coverage:**
- ✅ `run_alert_job` con deduplicación → Task 1
- ✅ `GET /alertas?ies_id=N` paginado → Task 2
- ✅ `PUT /alertas/{id}/leer` → Task 2
- ✅ Scheduler APScheduler startup/shutdown + ENABLE_SCHEDULER env → Task 3
- ✅ `POST /admin/jobs/alertas` trigger manual → Task 3
- ✅ `AlertaDB` + `AlertasHistorial` tipos TS → Task 4
- ✅ `getAlertas` + `markAlertaRead` api.ts → Task 4
- ✅ AlertasPanel tabs Actuales/Historial → Task 5
- ✅ Botón "✓ Leída" → Task 5
- ✅ RectorDashboard pasa `iesId` → Task 5
- ✅ 6 tests backend (2 jobs + 4 alertas) → Tasks 1-2
- ✅ 5 tests AlertasPanel (3 existentes + 2 nuevos) → Task 5
- ✅ 3 tests api.ts (getAlertas x2 + markAlertaRead) → Task 4

**Tests totales después del sprint:** ~30 (22 frontend + ~8 backend)

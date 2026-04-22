# Sprint 6 — Alertas Persistentes con Historial: Diseño

**Fecha:** 2026-04-21  
**Estado:** Aprobado  
**Proyecto:** OIA-EE — Observatorio de IA en Educación y Empleo  

---

## 1. Objetivo

Persistir las alertas KPI en la tabla `alertas` de PostgreSQL mediante un job nightly (APScheduler), y exponer un historial de alertas por IES con capacidad de marcar como leída. El RectorDashboard mostrará dos vistas: "Actuales" (on-the-fly, como Sprint 5) e "Historial" (desde DB con paginación).

---

## 2. Alcance del Sprint

**Incluido:**
- `pipeline/jobs/alert_job.py` — función `run_alert_job(db)` que itera todas las IES+carreras y persiste alertas
- Deduplicación: no crear alerta si ya existe una idéntica (mismo ies_id + carrera_id + tipo) en las últimas 24 horas
- `api/routers/alertas.py` — dos endpoints: GET /alertas y PUT /alertas/{id}/leer
- Scheduler APScheduler integrado en FastAPI (solo si `ENABLE_SCHEDULER=true`)
- Endpoint manual `POST /admin/jobs/alertas` para trigger desde AdminPanel
- AlertasPanel: tabs "Actuales" / "Historial", botón "Marcar leída" en historial
- 8 tests nuevos (6 backend + 2 frontend)

**Excluido (→ Sprint 7):**
- Simulador de escenarios ramp-up/ramp-down
- Filtro por severidad / tipo en historial
- Notificaciones por email

---

## 3. Modelo de Datos (existente, sin cambios)

La tabla `alertas` ya existe en `pipeline/db/models.py`:

```python
class Alerta(Base):
    __tablename__ = "alertas"
    id              = Column(String(36), primary_key=True, default=_uuid)
    ies_id          = Column(String(36), ForeignKey("ies.id"))
    carrera_id      = Column(String(36), ForeignKey("carreras.id"))
    tipo            = Column(String(50))       # 'd1_alto' | 'd2_bajo' | 'ambos'
    severidad       = Column(String(10))       # 'alta' | 'media'
    titulo          = Column(Text)
    mensaje         = Column(Text)
    accion_sugerida = Column(Text)             # null en Sprint 6
    fecha           = Column(DateTime(timezone=True), default=datetime.utcnow)
    leida           = Column(Boolean, default=False)
```

No se requieren migraciones Alembic — la tabla ya existe.

---

## 4. Backend

### 4.1 Alert Job — `pipeline/jobs/alert_job.py`

```python
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from pipeline.db.models import IES, CarreraIES, Carrera, Alerta
from pipeline.kpi_engine.kpi_runner import run_kpis

WINDOW_HORAS = 24

def _ya_existe(db: Session, ies_id: str, carrera_id: str, tipo: str) -> bool:
    cutoff = datetime.utcnow() - timedelta(hours=WINDOW_HORAS)  # naive UTC, matches model default
    return db.query(Alerta).filter(
        Alerta.ies_id == ies_id,
        Alerta.carrera_id == carrera_id,
        Alerta.tipo == tipo,
        Alerta.fecha >= cutoff,
    ).first() is not None

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
            db.add(Alerta(
                ies_id=ies.id,
                carrera_id=cie.carrera_id,
                tipo=tipo,
                severidad=severidad,
                titulo={"d1_alto": "D1 crítico", "d2_bajo": "D2 bajo", "ambos": "D1 crítico y D2 bajo"}[tipo],
                mensaje=f"D1 = {d1:.2f} (umbral: 0.70) · D2 = {d2:.2f} (umbral: 0.40)",
            ))
            creadas += 1
    db.commit()
    return creadas
```

### 4.2 Endpoints — `api/routers/alertas.py`

**GET /alertas**

```
GET /alertas?ies_id={id}&skip=0&limit=20
```

Respuesta 200:
```json
{
  "alertas": [
    {
      "id": "uuid",
      "ies_id": "uuid",
      "carrera_id": "uuid",
      "carrera_nombre": "Derecho",
      "tipo": "d1_alto",
      "severidad": "alta",
      "titulo": "D1 crítico",
      "mensaje": "D1 = 0.82 (umbral: 0.70) · D2 = 0.45 (umbral: 0.40)",
      "fecha": "2026-04-21T03:00:00",
      "leida": false
    }
  ],
  "total": 5
}
```

JOIN con tabla `carreras` para obtener `carrera_nombre` desde el campo `carrera.nombre_norm`.  
Ordenadas: `leida=False` primero, luego `fecha DESC`.

**PUT /alertas/{id}/leer**

```
PUT /alertas/uuid-aqui/leer
```

Respuesta 200:
```json
{ "id": "uuid", "leida": true }
```

Error 404 si no existe: `{ "detail": "Alerta no encontrada" }`.

### 4.3 Schemas — `api/schemas.py` (adiciones)

```python
class AlertaDBOut(BaseModel):
    id: str
    ies_id: str
    carrera_id: str
    carrera_nombre: str
    tipo: str
    severidad: str
    titulo: str
    mensaje: str | None
    fecha: str
    leida: bool
    model_config = ConfigDict(from_attributes=True)

class AlertasHistorialOut(BaseModel):
    alertas: list[AlertaDBOut]
    total: int

class AlertaLeidaOut(BaseModel):
    id: str
    leida: bool
```

### 4.4 Scheduler + Trigger manual — `api/main.py`

```python
import os
from apscheduler.schedulers.background import BackgroundScheduler
from pipeline.db import get_session
from pipeline.jobs.alert_job import run_alert_job

scheduler = BackgroundScheduler()

def _run_alert_job_scheduled():
    with get_session() as db:
        run_alert_job(db)

@app.on_event("startup")
def startup():
    if os.getenv("ENABLE_SCHEDULER", "false").lower() == "true":
        scheduler.add_job(_run_alert_job_scheduled, "cron", hour=3, minute=0)
        scheduler.start()

@app.on_event("shutdown")
def shutdown():
    if scheduler.running:
        scheduler.shutdown()
```

Endpoint trigger manual se añade al router `/admin`:

```
POST /admin/jobs/alertas
Headers: X-Admin-Key: {key}
Response: { "alertas_creadas": 3 }
```

---

## 5. Tipos TypeScript

Se añade a `frontend/src/lib/types.ts`:

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

---

## 6. Funciones API cliente

Se añade a `frontend/src/lib/api.ts`:

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

---

## 7. Componente AlertasPanel (actualización)

**`frontend/src/components/AlertasPanel.tsx`** — recibe `alertas: AlertaItem[]` (actuales, on-the-fly) e `iesId: string`.

- Tab "Actuales": mismo comportamiento de Sprint 5 (muestra prop `alertas`)
- Tab "Historial": llama a `getAlertas(iesId)` via `useEffect`, muestra lista con indicador `leida` (texto en gris si leída), botón "✓ Leída" que llama a `markAlertaRead(id)` y refresca
- Estado inicial: tab "Actuales" activo
- Si historial vacío: "Sin alertas registradas"

**`frontend/src/components/RectorDashboard.tsx`** — actualización: pasa `iesId` a AlertasPanel además de `alertas`.

```tsx
<AlertasPanel alertas={data.alertas} iesId={iesId} />
```

---

## 8. Tests

### `tests/api/test_alertas.py` — 4 tests

1. `test_get_alertas_vacio` — GET /alertas?ies_id=nuevo retorna `{"alertas": [], "total": 0}`
2. `test_get_alertas_retorna_datos` — IES con alerta en DB → aparece en respuesta con carrera_nombre
3. `test_marcar_alerta_leida` — PUT /alertas/{id}/leer → `leida: true`
4. `test_marcar_alerta_inexistente` — PUT /alertas/no-existe/leer → 404

### `tests/jobs/test_alert_job.py` — 2 tests (nuevo directorio, espejo de `pipeline/jobs/`)

1. `test_alert_job_persiste_alerta` — run_alert_job con IES+carrera con D1 > 0.7 → crea alerta en DB
2. `test_alert_job_no_duplica` — run_alert_job corrida dos veces → solo 1 alerta creada

### `frontend/__tests__/AlertasPanel.test.tsx` — 2 tests adicionales (existentes: 3 → total: 5)

4. `muestra tab historial y carga alertas DB` — tab click → llama getAlertas → renderiza AlertaDB
5. `marcar leída llama markAlertaRead` — click "✓ Leída" → spy en markAlertaRead invocado

---

## 9. Estructura de archivos

**Nuevos:**
```
pipeline/jobs/alert_job.py
api/routers/alertas.py
tests/api/test_alertas.py
tests/jobs/test_alert_job.py        ← nuevo directorio espejo de pipeline/jobs/
```

**Modificados:**
```
api/main.py                        ← +scheduler + register alertas router
api/schemas.py                     ← +AlertaDBOut, AlertasHistorialOut, AlertaLeidaOut
api/routers/admin.py               ← +POST /admin/jobs/alertas
frontend/src/lib/types.ts          ← +AlertaDB, AlertasHistorial
frontend/src/lib/api.ts            ← +getAlertas, markAlertaRead
frontend/src/components/AlertasPanel.tsx  ← +tabs Actuales/Historial
frontend/src/components/RectorDashboard.tsx ← pasa iesId a AlertasPanel
frontend/__tests__/AlertasPanel.test.tsx   ← +2 tests
```

---

## 10. Dependencias

- APScheduler ya instalado (`apscheduler==3.10.4`)
- No se añaden dependencias npm ni Python nuevas
- No se requieren migraciones Alembic (tabla `alertas` ya existe)
- Requiere `ENABLE_SCHEDULER=true` para activar el job automático

---

## 11. Tests totales después del sprint

| Suite | Antes | Nuevos | Total |
|-------|-------|--------|-------|
| frontend | 22 | +2 | 24 |
| backend (pytest) | 3 (test_rector) | +6 | ~9 |

**Total estimado: ~30 tests**

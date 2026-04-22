# Sprint 7 — Simulador de Escenarios: Diseño

**Fecha:** 2026-04-21  
**Estado:** Aprobado  
**Proyecto:** OIA-EE — Observatorio de IA en Educación y Empleo  

---

## 1. Objetivo

Añadir un simulador de escenarios "what-if" al Dashboard Rector. El rector puede seleccionar una carrera, ajustar los 6 sub-indicadores KPI (IVA, BES, VAC, IOE, IHE, IEA) y ver en tiempo real cómo cambiarían los scores D1 y D2. Al confirmar, el escenario se persiste en la tabla `escenarios`.

---

## 2. Alcance del Sprint

**Incluido:**
- `pipeline/scenario_engine/simulator.py` — función `simulate_kpis` con fórmulas ponderadas
- `api/routers/escenarios.py` — `POST /escenarios/simular`
- `SimuladorModal.tsx` — modal con 6 inputs + preview client-side + botón guardar
- Botón "Simular →" por fila en `RectorCarrerasTable`
- 8 tests nuevos (2 simulator + 3 API + 3 frontend)

**Excluido (→ Sprint 8):**
- Horizonte temporal (años) y trayectorias ramp-up/ramp-down
- `GET /escenarios` para historial de simulaciones
- Comparación entre múltiples escenarios guardados

---

## 3. Fórmulas KPI (del kpi_engine existente)

```
D1_score = IVA × 0.5 + BES × 0.3 + VAC × 0.2
D2_score = IOE × 0.4 + IHE × 0.35 + IEA × 0.25
```

Todos los sub-indicadores tienen rango [0, 1]. El simulador aplica las mismas fórmulas sin recalcular desde datos ONET.

---

## 4. Modelo de Datos (existente, sin cambios)

```python
class Escenario(Base):
    __tablename__ = "escenarios"
    id              = Column(String(36), primary_key=True, default=_uuid)
    ies_id          = Column(String(36), ForeignKey("ies.id"))
    tipo            = Column(String(20))          # "custom" en Sprint 7
    horizonte_anios = Column(SmallInteger)         # null en Sprint 7
    acciones        = Column(Text)                 # JSON con los 6 inputs
    proyecciones    = Column(Text)                 # JSON con D1/D2 proyectados
    fecha_creacion  = Column(DateTime(timezone=True), default=datetime.utcnow)
```

No se requieren migraciones Alembic.

---

## 5. Backend

### 5.1 Simulator — `pipeline/scenario_engine/simulator.py`

```python
# pipeline/scenario_engine/simulator.py
from dataclasses import dataclass


@dataclass
class D1Inputs:
    iva: float
    bes: float
    vac: float


@dataclass
class D2Inputs:
    ioe: float
    ihe: float
    iea: float


@dataclass
class SimResult:
    d1_score: float
    d2_score: float
    d1_inputs: D1Inputs
    d2_inputs: D2Inputs


def simulate_kpis(d1: D1Inputs, d2: D2Inputs) -> SimResult:
    """Aplica las fórmulas ponderadas D1/D2 a los sub-indicadores dados."""
    d1_score = round(d1.iva * 0.5 + d1.bes * 0.3 + d1.vac * 0.2, 4)
    d2_score = round(d2.ioe * 0.4 + d2.ihe * 0.35 + d2.iea * 0.25, 4)
    return SimResult(d1_score=d1_score, d2_score=d2_score, d1_inputs=d1, d2_inputs=d2)
```

### 5.2 Endpoint — `api/routers/escenarios.py`

**POST /escenarios/simular**

Request body:
```json
{
  "ies_id": "uuid",
  "carrera_id": "uuid",
  "carrera_nombre": "Derecho",
  "iva": 0.75, "bes": 0.80, "vac": 0.60,
  "ioe": 0.40, "ihe": 0.35, "iea": 0.45
}
```

Respuesta 200:
```json
{
  "id": "uuid",
  "carrera_nombre": "Derecho",
  "d1_score": 0.745,
  "d2_score": 0.3875,
  "iva": 0.75, "bes": 0.80, "vac": 0.60,
  "ioe": 0.40, "ihe": 0.35, "iea": 0.45,
  "fecha": "2026-04-21T05:00:00"
}
```

Validación: todos los valores en [0, 1]. Si alguno está fuera de rango → 422.

Persistencia: guarda en `escenarios` con:
- `tipo = "custom"`
- `horizonte_anios = None`
- `acciones = json.dumps({"carrera_id": ..., "carrera_nombre": ..., "iva": ..., "bes": ..., "vac": ..., "ioe": ..., "ihe": ..., "iea": ...})`
- `proyecciones = json.dumps({"d1_score": ..., "d2_score": ...})`

Nota: `carrera_nombre` en la respuesta se echa desde el input (no requiere JOIN — la tabla `escenarios` no tiene columna `carrera_id` separada).

### 5.3 Schemas — `api/schemas.py` (adiciones)

```python
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
```

### 5.4 Registrar router en `api/main.py`

```python
from api.routers import noticias, kpis, admin, rector, alertas, escenarios
# ...
app.include_router(escenarios.router, prefix="/escenarios", tags=["escenarios"])
```

---

## 6. Tipos TypeScript

Se añaden a `frontend/src/lib/types.ts`:

```typescript
export interface SimularInput {
  ies_id: string
  carrera_id: string
  carrera_nombre: string
  iva: number
  bes: number
  vac: number
  ioe: number
  ihe: number
  iea: number
}

export interface SimResult {
  id: string
  carrera_nombre: string
  d1_score: number
  d2_score: number
  iva: number
  bes: number
  vac: number
  ioe: number
  ihe: number
  iea: number
  fecha: string
}
```

---

## 7. Función API cliente

Se añade a `frontend/src/lib/api.ts`:

```typescript
export async function postSimular(input: SimularInput): Promise<SimResult> {
  const res = await fetch(`${BASE}/escenarios/simular`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}
```

---

## 8. Cálculo client-side (TypeScript)

Se añade a `frontend/src/lib/kpi-colors.ts` (módulo compartido):

```typescript
export function calcD1(iva: number, bes: number, vac: number): number {
  return Math.round((iva * 0.5 + bes * 0.3 + vac * 0.2) * 10000) / 10000
}

export function calcD2(ioe: number, ihe: number, iea: number): number {
  return Math.round((ioe * 0.4 + ihe * 0.35 + iea * 0.25) * 10000) / 10000
}
```

---

## 9. Componentes Frontend

### `frontend/src/components/SimuladorModal.tsx`

Componente client-side. Props: `carrera: CarreraKpi`, `iesId: string`, `onClose: () => void`.

- 6 inputs `type="number"` con `step="0.01"` `min="0"` `max="1"`, pre-llenados con los valores actuales del KPI
- Si `carrera.kpi` es null: valores iniciales = 0.5 para todos
- Preview en tiempo real: calcula `calcD1` y `calcD2` con `onChange`, muestra:
  - "D1 actual: 0.82 → D1 proyectado: 0.65" con flecha coloreada (rojo→verde si mejora)
  - "D2 actual: 0.35 → D2 proyectado: 0.48"
- Estado: `saving: boolean`, `saved: SimResult | null`
- Botón "Guardar escenario" → llama `postSimular` → muestra confirmación "Escenario guardado ✓"
- Botón "Cerrar" → `onClose()`

### `frontend/src/components/RectorCarrerasTable.tsx` (actualización)

Añade al final de cada fila (después de la columna D2):
- Columna "Acción" con botón `<button onClick={() => setSimulando(carrera.id)}>Simular →</button>`
- Estado: `simulando: string | null` (id de la carrera en simulación)
- Si `simulando !== null`: renderiza `<SimuladorModal carrera={carrera} iesId={iesId} onClose={() => setSimulando(null)} />`
- `RectorCarrerasTable` recibe nueva prop `iesId: string`

### `frontend/src/components/RectorDashboard.tsx` (actualización)

Pasa `iesId` a `RectorCarrerasTable`:

```tsx
<RectorCarrerasTable carreras={data.carreras} iesId={iesId} />
```

---

## 10. Tests

### `tests/scenario_engine/test_simulator.py` — 2 tests

1. `test_simulate_kpis_formula` — valores conocidos → D1 y D2 esperados exactos
2. `test_simulate_kpis_extremos` — todos 0 → D1=0, D2=0; todos 1 → D1=1, D2=1

### `tests/api/test_escenarios.py` — 3 tests

1. `test_simular_retorna_resultado` — POST con inputs válidos → 200, d1_score y d2_score correctos
2. `test_simular_persiste_escenario` — POST → verifica registro en tabla `escenarios`
3. `test_simular_input_invalido` — valor fuera de [0,1] → 422

### `frontend/__tests__/SimuladorModal.test.tsx` — 3 tests

1. `renderiza inputs pre-llenados con valores actuales del kpi`
2. `calcula preview d1/d2 en tiempo real al cambiar input`
3. `llama postSimular al hacer click en Guardar`

---

## 11. Estructura de archivos

**Nuevos:**
```
pipeline/scenario_engine/__init__.py
pipeline/scenario_engine/simulator.py
api/routers/escenarios.py
tests/scenario_engine/__init__.py
tests/scenario_engine/test_simulator.py
tests/api/test_escenarios.py
frontend/src/components/SimuladorModal.tsx
frontend/__tests__/SimuladorModal.test.tsx
```

**Modificados:**
```
api/schemas.py                              ← +SimularInput, SimularResult
api/main.py                                 ← +escenarios router, v0.6.0
frontend/src/lib/types.ts                   ← +SimularInput, SimResult
frontend/src/lib/api.ts                     ← +postSimular
frontend/src/lib/kpi-colors.ts              ← +calcD1, calcD2
frontend/src/components/RectorCarrerasTable.tsx ← +botón Simular, +iesId prop
frontend/src/components/RectorDashboard.tsx ← pasa iesId a RectorCarrerasTable
```

---

## 12. Dependencias

- No se añaden dependencias npm ni Python nuevas
- No se requieren migraciones Alembic (tabla `escenarios` ya existe)
- `Field` de Pydantic ya disponible (`from pydantic import BaseModel, Field`)

---

## 13. Tests totales después del sprint

| Suite | Antes | Nuevos | Total |
|-------|-------|--------|-------|
| Frontend | 27 | +3 | 30 |
| Backend (pytest) | ~9 | +5 | ~14 |

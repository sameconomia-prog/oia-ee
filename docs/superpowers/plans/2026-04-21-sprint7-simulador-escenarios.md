# Sprint 7 — Simulador de Escenarios: Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir un simulador "what-if" al Dashboard Rector: el rector ajusta 6 sub-indicadores KPI y ve en tiempo real cómo cambiarían D1/D2; al confirmar, el escenario se persiste en la tabla `escenarios`.

**Architecture:** Motor de cálculo puro en Python (`simulator.py`), endpoint REST `POST /escenarios/simular` que aplica fórmulas y persiste en la tabla `escenarios` existente (sin migraciones), y modal React con preview calculado client-side usando las mismas fórmulas. El botón "Simular →" se añade por fila en `RectorCarrerasTable`.

**Tech Stack:** FastAPI + SQLAlchemy (SQLite/Postgres), Pydantic v2 + `Field`, Python dataclasses, Next.js 14 App Router, React hooks (`useState`, `'use client'`), Jest 29 + React Testing Library.

---

## Estructura de archivos

**Crear:**
- `pipeline/scenario_engine/__init__.py` — vacío (hace el directorio paquete Python)
- `pipeline/scenario_engine/simulator.py` — dataclasses `D1Inputs`, `D2Inputs`, `SimResult` + función `simulate_kpis`
- `api/routers/escenarios.py` — `POST /escenarios/simular`
- `tests/scenario_engine/__init__.py` — vacío
- `tests/scenario_engine/test_simulator.py` — 2 tests del motor (sin DB)
- `tests/api/test_escenarios.py` — 3 tests del endpoint (usa fixtures `client`, `db_session` del conftest existente en `tests/api/`)
- `frontend/src/components/SimuladorModal.tsx` — modal con 6 inputs + preview + guardar
- `frontend/__tests__/SimuladorModal.test.tsx` — 3 tests del modal

**Modificar:**
- `api/schemas.py` — añadir `SimularInput`, `SimularResult` + `Field` al import de pydantic
- `api/main.py` — registrar router escenarios, bump versión a `"0.6.0"`
- `frontend/src/lib/types.ts` — añadir interfaces `SimularInput`, `SimResult`
- `frontend/src/lib/api.ts` — añadir función `postSimular` + extender import de tipos
- `frontend/src/lib/kpi-colors.ts` — añadir `calcD1`, `calcD2`
- `frontend/src/components/RectorCarrerasTable.tsx` — añadir prop `iesId`, columna "Acción", botón "Simular →", estado `simulando`
- `frontend/src/components/RectorDashboard.tsx` — pasar `iesId` a `RectorCarrerasTable`

---

### Task 1: Simulator engine + 2 tests

**Files:**
- Create: `pipeline/scenario_engine/__init__.py`
- Create: `pipeline/scenario_engine/simulator.py`
- Create: `tests/scenario_engine/__init__.py`
- Create: `tests/scenario_engine/test_simulator.py`

- [ ] **Step 1: Crear archivos `__init__.py` vacíos**

```bash
touch pipeline/scenario_engine/__init__.py tests/scenario_engine/__init__.py
```

- [ ] **Step 2: Escribir los tests que fallarán**

Crear `tests/scenario_engine/test_simulator.py`:

```python
# tests/scenario_engine/test_simulator.py
from pipeline.scenario_engine.simulator import D1Inputs, D2Inputs, simulate_kpis


def test_simulate_kpis_formula():
    d1 = D1Inputs(iva=0.75, bes=0.80, vac=0.60)
    d2 = D2Inputs(ioe=0.40, ihe=0.35, iea=0.45)
    result = simulate_kpis(d1, d2)
    # D1 = 0.75*0.5 + 0.80*0.3 + 0.60*0.2 = 0.375 + 0.240 + 0.120 = 0.735
    assert result.d1_score == 0.735
    # D2 = 0.40*0.4 + 0.35*0.35 + 0.45*0.25 = 0.160 + 0.1225 + 0.1125 = 0.395
    assert result.d2_score == 0.395
    assert result.d1_inputs is d1
    assert result.d2_inputs is d2


def test_simulate_kpis_extremos():
    zeros = simulate_kpis(D1Inputs(0.0, 0.0, 0.0), D2Inputs(0.0, 0.0, 0.0))
    assert zeros.d1_score == 0.0
    assert zeros.d2_score == 0.0

    ones = simulate_kpis(D1Inputs(1.0, 1.0, 1.0), D2Inputs(1.0, 1.0, 1.0))
    assert ones.d1_score == 1.0
    assert ones.d2_score == 1.0
```

- [ ] **Step 3: Verificar que los tests fallan**

Desde la raíz del proyecto:

```bash
python -m pytest tests/scenario_engine/test_simulator.py -v
```

Expected: `ModuleNotFoundError` — `pipeline.scenario_engine.simulator` no existe todavía.

- [ ] **Step 4: Implementar el simulator**

Crear `pipeline/scenario_engine/simulator.py`:

```python
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
    d1_score = round(d1.iva * 0.5 + d1.bes * 0.3 + d1.vac * 0.2, 4)
    d2_score = round(d2.ioe * 0.4 + d2.ihe * 0.35 + d2.iea * 0.25, 4)
    return SimResult(d1_score=d1_score, d2_score=d2_score, d1_inputs=d1, d2_inputs=d2)
```

- [ ] **Step 5: Verificar que los tests pasan**

```bash
python -m pytest tests/scenario_engine/test_simulator.py -v
```

Expected: `2 passed`.

- [ ] **Step 6: Commit**

```bash
git add pipeline/scenario_engine/__init__.py pipeline/scenario_engine/simulator.py \
        tests/scenario_engine/__init__.py tests/scenario_engine/test_simulator.py
git commit -m "feat: simulator engine — simulate_kpis con fórmulas ponderadas D1/D2"
```

---

### Task 2: Schemas + Endpoint POST /escenarios/simular + 3 tests API

**Files:**
- Modify: `api/schemas.py`
- Create: `api/routers/escenarios.py`
- Create: `tests/api/test_escenarios.py`

**Context:** `tests/api/conftest.py` ya existe con fixtures `test_engine`, `db_session`, `client`. El `client` fixture hace override de `get_db` para usar el mismo `db_session` de SQLite en memoria. El modelo `Escenario` ya existe en `pipeline/db/models.py` con columnas: `id`, `ies_id` (FK a `ies`), `tipo`, `horizonte_anios`, `acciones` (Text JSON), `proyecciones` (Text JSON), `fecha_creacion`.

- [ ] **Step 1: Añadir `SimularInput` y `SimularResult` a `api/schemas.py`**

Primero, cambiar la primera línea del archivo de:

```python
from pydantic import BaseModel
```

a:

```python
from pydantic import BaseModel, Field
```

Luego añadir al final del archivo:

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

- [ ] **Step 2: Escribir los tests que fallarán**

Crear `tests/api/test_escenarios.py`:

```python
# tests/api/test_escenarios.py
import json
from pipeline.db.models import IES, Escenario

_VALID_INPUT = {
    "carrera_id": "carrera-uuid-001",
    "carrera_nombre": "Derecho",
    "iva": 0.75, "bes": 0.80, "vac": 0.60,
    "ioe": 0.40, "ihe": 0.35, "iea": 0.45,
}


def test_simular_retorna_resultado(client, db_session):
    ies = IES(nombre="IES Simulador", nombre_corto="IS")
    db_session.add(ies)
    db_session.flush()

    resp = client.post("/escenarios/simular", json={**_VALID_INPUT, "ies_id": ies.id})
    assert resp.status_code == 200
    data = resp.json()
    assert data["carrera_nombre"] == "Derecho"
    # D1 = 0.75*0.5 + 0.80*0.3 + 0.60*0.2 = 0.735
    assert data["d1_score"] == 0.735
    # D2 = 0.40*0.4 + 0.35*0.35 + 0.45*0.25 = 0.395
    assert data["d2_score"] == 0.395
    assert "id" in data
    assert "fecha" in data


def test_simular_persiste_escenario(client, db_session):
    ies = IES(nombre="IES Persistir", nombre_corto="IP")
    db_session.add(ies)
    db_session.flush()

    resp = client.post("/escenarios/simular", json={**_VALID_INPUT, "ies_id": ies.id})
    assert resp.status_code == 200
    escenario_id = resp.json()["id"]

    db_session.expire_all()
    escenario = db_session.query(Escenario).filter_by(id=escenario_id).first()
    assert escenario is not None
    assert escenario.tipo == "custom"
    assert escenario.horizonte_anios is None
    acciones = json.loads(escenario.acciones)
    assert acciones["iva"] == 0.75
    assert acciones["carrera_nombre"] == "Derecho"
    proyecciones = json.loads(escenario.proyecciones)
    assert proyecciones["d1_score"] == 0.735


def test_simular_input_invalido(client, db_session):
    ies = IES(nombre="IES Invalido", nombre_corto="II")
    db_session.add(ies)
    db_session.flush()

    # iva = 1.5 está fuera del rango [0, 1]
    resp = client.post("/escenarios/simular", json={**_VALID_INPUT, "ies_id": ies.id, "iva": 1.5})
    assert resp.status_code == 422
```

- [ ] **Step 3: Verificar que los tests fallan**

```bash
python -m pytest tests/api/test_escenarios.py -v
```

Expected: 404 o error de importación — el router no existe todavía.

- [ ] **Step 4: Crear `api/routers/escenarios.py`**

```python
# api/routers/escenarios.py
import json
from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from api.deps import get_db
from api.schemas import SimularInput, SimularResult
from pipeline.db.models import Escenario
from pipeline.scenario_engine.simulator import D1Inputs, D2Inputs, simulate_kpis

router = APIRouter()


@router.post("/simular", response_model=SimularResult)
def simular(body: SimularInput, db: Session = Depends(get_db)):
    result = simulate_kpis(
        D1Inputs(iva=body.iva, bes=body.bes, vac=body.vac),
        D2Inputs(ioe=body.ioe, ihe=body.ihe, iea=body.iea),
    )
    escenario = Escenario(
        ies_id=body.ies_id,
        tipo="custom",
        horizonte_anios=None,
        acciones=json.dumps({
            "carrera_id": body.carrera_id,
            "carrera_nombre": body.carrera_nombre,
            "iva": body.iva, "bes": body.bes, "vac": body.vac,
            "ioe": body.ioe, "ihe": body.ihe, "iea": body.iea,
        }),
        proyecciones=json.dumps({
            "d1_score": result.d1_score,
            "d2_score": result.d2_score,
        }),
    )
    db.add(escenario)
    db.commit()
    db.refresh(escenario)
    fecha = (
        escenario.fecha_creacion.isoformat()
        if escenario.fecha_creacion
        else datetime.utcnow().isoformat()
    )
    return SimularResult(
        id=escenario.id,
        carrera_nombre=body.carrera_nombre,
        d1_score=result.d1_score,
        d2_score=result.d2_score,
        iva=body.iva, bes=body.bes, vac=body.vac,
        ioe=body.ioe, ihe=body.ihe, iea=body.iea,
        fecha=fecha,
    )
```

- [ ] **Step 5: Verificar que los tests pasan**

```bash
python -m pytest tests/api/test_escenarios.py -v
```

Expected: `3 passed`.

- [ ] **Step 6: Commit**

```bash
git add api/schemas.py api/routers/escenarios.py tests/api/test_escenarios.py
git commit -m "feat: SimularInput/SimularResult schemas + endpoint POST /escenarios/simular"
```

---

### Task 3: Registrar router en `api/main.py` + bump versión

**Files:**
- Modify: `api/main.py`

- [ ] **Step 1: Actualizar `api/main.py`**

Hacer dos cambios en el archivo:

**Cambio 1** — línea del import de routers, de:

```python
from api.routers import noticias, kpis, admin, rector, alertas
```

a:

```python
from api.routers import noticias, kpis, admin, rector, alertas, escenarios
```

**Cambio 2** — versión, de `"0.5.0"` a `"0.6.0"`:

```python
app = FastAPI(title="OIA-EE API", version="0.6.0")
```

**Cambio 3** — añadir el router después de la línea de alertas:

```python
app.include_router(alertas.router, prefix="/alertas", tags=["alertas"])
app.include_router(escenarios.router, prefix="/escenarios", tags=["escenarios"])
```

- [ ] **Step 2: Verificar todos los tests de backend**

```bash
python -m pytest tests/ -v
```

Expected: ≥14 passed (9 previos + 2 simulator + 3 escenarios).

- [ ] **Step 3: Commit**

```bash
git add api/main.py
git commit -m "feat: registrar router escenarios en main.py, bump versión 0.6.0"
```

---

### Task 4: Frontend — tipos + API client + funciones de cálculo

**Files:**
- Modify: `frontend/src/lib/types.ts`
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/src/lib/kpi-colors.ts`

**Context:** `types.ts` actualmente exporta `CarreraKpi`, `AlertaItem`, `AlertaDB`, etc. `api.ts` importa de `./types` y usa `const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'`. `kpi-colors.ts` actualmente exporta `dotColor` y `textColor`.

- [ ] **Step 1: Añadir `SimularInput` y `SimResult` al final de `frontend/src/lib/types.ts`**

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

- [ ] **Step 2: Actualizar `frontend/src/lib/api.ts`**

**Cambio 1** — extender el import de tipos en la primera línea de:

```typescript
import type { Noticia, KpiResult, IngestResult, RectorData, AlertasHistorial } from './types'
```

a:

```typescript
import type { Noticia, KpiResult, IngestResult, RectorData, AlertasHistorial, SimularInput, SimResult } from './types'
```

**Cambio 2** — añadir `postSimular` al final del archivo:

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

- [ ] **Step 3: Añadir `calcD1` y `calcD2` al final de `frontend/src/lib/kpi-colors.ts`**

```typescript
export function calcD1(iva: number, bes: number, vac: number): number {
  return Math.round((iva * 0.5 + bes * 0.3 + vac * 0.2) * 10000) / 10000
}

export function calcD2(ioe: number, ihe: number, iea: number): number {
  return Math.round((ioe * 0.4 + ihe * 0.35 + iea * 0.25) * 10000) / 10000
}
```

- [ ] **Step 4: Verificar TypeScript**

```bash
cd frontend && npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/types.ts frontend/src/lib/api.ts frontend/src/lib/kpi-colors.ts
git commit -m "feat: tipos SimularInput/SimResult, postSimular, calcD1/calcD2"
```

---

### Task 5: SimuladorModal + 3 tests frontend

**Files:**
- Create: `frontend/__tests__/SimuladorModal.test.tsx`
- Create: `frontend/src/components/SimuladorModal.tsx`

**Context:** Los tests usan `jest.mock('@/lib/api')`. Los inputs se identifican via `aria-label`. `calcD1(1.0, 0.80, 0.60)` = 0.86 (para verificar el preview en tiempo real).

- [ ] **Step 1: Escribir los tests que fallarán**

Crear `frontend/__tests__/SimuladorModal.test.tsx`:

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SimuladorModal from '@/components/SimuladorModal'
import type { CarreraKpi } from '@/lib/types'
import * as api from '@/lib/api'

jest.mock('@/lib/api')
const mockPostSimular = api.postSimular as jest.MockedFunction<typeof api.postSimular>

beforeEach(() => {
  mockPostSimular.mockReset()
})

const carreraConKpi: CarreraKpi = {
  id: 'c1',
  nombre: 'Derecho',
  matricula: 450,
  kpi: {
    d1_obsolescencia: { score: 0.82, iva: 0.75, bes: 0.80, vac: 0.60 },
    d2_oportunidades: { score: 0.35, ioe: 0.40, ihe: 0.35, iea: 0.45 },
  },
}

test('renderiza inputs pre-llenados con valores actuales del kpi', () => {
  render(<SimuladorModal carrera={carreraConKpi} iesId="ies1" onClose={() => {}} />)
  const ivaInput = screen.getByLabelText('IVA') as HTMLInputElement
  expect(ivaInput.value).toBe('0.75')
  const besInput = screen.getByLabelText('BES') as HTMLInputElement
  expect(besInput.value).toBe('0.8')
})

test('calcula preview d1/d2 en tiempo real al cambiar input', () => {
  render(<SimuladorModal carrera={carreraConKpi} iesId="ies1" onClose={() => {}} />)
  const ivaInput = screen.getByLabelText('IVA')
  fireEvent.change(ivaInput, { target: { value: '1.0' } })
  // D1 = 1.0*0.5 + 0.80*0.3 + 0.60*0.2 = 0.5 + 0.24 + 0.12 = 0.86 → renderizado como "0.8600"
  expect(screen.getByText(/0\.86/)).toBeInTheDocument()
})

test('llama postSimular y muestra confirmación al hacer click en Guardar', async () => {
  mockPostSimular.mockResolvedValue({
    id: 'esc1',
    carrera_nombre: 'Derecho',
    d1_score: 0.735,
    d2_score: 0.395,
    iva: 0.75, bes: 0.80, vac: 0.60,
    ioe: 0.40, ihe: 0.35, iea: 0.45,
    fecha: '2026-04-21T05:00:00',
  })
  render(<SimuladorModal carrera={carreraConKpi} iesId="ies1" onClose={() => {}} />)
  fireEvent.click(screen.getByText('Guardar escenario'))
  await waitFor(() =>
    expect(mockPostSimular).toHaveBeenCalledWith(
      expect.objectContaining({
        ies_id: 'ies1',
        carrera_id: 'c1',
        carrera_nombre: 'Derecho',
        iva: 0.75,
      })
    )
  )
  await waitFor(() => expect(screen.getByText(/Escenario guardado/)).toBeInTheDocument())
})
```

- [ ] **Step 2: Verificar que los tests fallan**

```bash
cd frontend && npm test -- --testPathPattern=SimuladorModal --watchAll=false
```

Expected: 3 FAILED — el componente no existe.

- [ ] **Step 3: Crear `frontend/src/components/SimuladorModal.tsx`**

```tsx
'use client'
import { useState } from 'react'
import type { CarreraKpi, SimResult } from '@/lib/types'
import { calcD1, calcD2 } from '@/lib/kpi-colors'
import { postSimular } from '@/lib/api'

function arrowColor(projected: number, actual: number | undefined, isD1: boolean): string {
  if (actual === undefined) return 'text-gray-400'
  const improved = isD1 ? projected < actual : projected > actual
  const worsened = isD1 ? projected > actual : projected < actual
  if (improved) return 'text-green-600'
  if (worsened) return 'text-red-600'
  return 'text-gray-400'
}

export default function SimuladorModal({
  carrera,
  iesId,
  onClose,
}: {
  carrera: CarreraKpi
  iesId: string
  onClose: () => void
}) {
  const kpi = carrera.kpi
  const [iva, setIva] = useState(kpi?.d1_obsolescencia.iva ?? 0.5)
  const [bes, setBes] = useState(kpi?.d1_obsolescencia.bes ?? 0.5)
  const [vac, setVac] = useState(kpi?.d1_obsolescencia.vac ?? 0.5)
  const [ioe, setIoe] = useState(kpi?.d2_oportunidades.ioe ?? 0.5)
  const [ihe, setIhe] = useState(kpi?.d2_oportunidades.ihe ?? 0.5)
  const [iea, setIea] = useState(kpi?.d2_oportunidades.iea ?? 0.5)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<SimResult | null>(null)

  const d1Actual = kpi?.d1_obsolescencia.score
  const d2Actual = kpi?.d2_oportunidades.score
  const d1Projected = calcD1(iva, bes, vac)
  const d2Projected = calcD2(ioe, ihe, iea)

  const inputs = [
    { label: 'IVA', value: iva, set: setIva },
    { label: 'BES', value: bes, set: setBes },
    { label: 'VAC', value: vac, set: setVac },
    { label: 'IOE', value: ioe, set: setIoe },
    { label: 'IHE', value: ihe, set: setIhe },
    { label: 'IEA', value: iea, set: setIea },
  ]

  async function handleSave() {
    setSaving(true)
    try {
      const result = await postSimular({
        ies_id: iesId,
        carrera_id: carrera.id,
        carrera_nombre: carrera.nombre,
        iva, bes, vac, ioe, ihe, iea,
      })
      setSaved(result)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">
          Simular escenario — {carrera.nombre}
        </h3>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {inputs.map(({ label, value, set }) => (
            <div key={label}>
              <label
                className="block text-xs text-gray-500 mb-1"
                htmlFor={`sim-${label}`}
              >
                {label}
              </label>
              <input
                id={`sim-${label}`}
                aria-label={label}
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={value}
                onChange={(e) => set(parseFloat(e.target.value) || 0)}
                className="w-full border rounded px-2 py-1 text-sm"
              />
            </div>
          ))}
        </div>

        <div className="bg-gray-50 rounded p-3 text-xs space-y-1 mb-4">
          <div className="flex items-center gap-1">
            <span className="text-gray-500">D1 actual:</span>
            <span className="font-mono">{d1Actual?.toFixed(4) ?? '—'}</span>
            <span className={arrowColor(d1Projected, d1Actual, true)}>→</span>
            <span className="font-mono font-semibold">
              D1 proyectado: {d1Projected.toFixed(4)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500">D2 actual:</span>
            <span className="font-mono">{d2Actual?.toFixed(4) ?? '—'}</span>
            <span className={arrowColor(d2Projected, d2Actual, false)}>→</span>
            <span className="font-mono font-semibold">
              D2 proyectado: {d2Projected.toFixed(4)}
            </span>
          </div>
        </div>

        {saved && (
          <p className="text-xs text-green-600 mb-3">Escenario guardado ✓</p>
        )}

        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 border rounded"
          >
            Cerrar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar escenario'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Verificar que los tests pasan**

```bash
cd frontend && npm test -- --testPathPattern=SimuladorModal --watchAll=false
```

Expected: `3 passed`.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/SimuladorModal.tsx frontend/__tests__/SimuladorModal.test.tsx
git commit -m "feat: SimuladorModal con preview client-side y confirmación al guardar"
```

---

### Task 6: RectorCarrerasTable + RectorDashboard — wiring del botón Simular

**Files:**
- Modify: `frontend/src/components/RectorCarrerasTable.tsx`
- Modify: `frontend/src/components/RectorDashboard.tsx`

**Context:** `RectorCarrerasTable` actualmente recibe `{ carreras: CarreraKpi[] }`. Necesita añadir `iesId: string`, estado `simulando: string | null`, columna "Acción" y botón por fila. `RectorDashboard` actualmente renderiza `<RectorCarrerasTable carreras={data.carreras} />` y necesita pasar `iesId={iesId}`.

- [ ] **Step 1: Reemplazar `frontend/src/components/RectorCarrerasTable.tsx` completamente**

```tsx
'use client'
import { useState } from 'react'
import type { CarreraKpi } from '@/lib/types'
import { dotColor, textColor } from '@/lib/kpi-colors'
import SimuladorModal from './SimuladorModal'

type SortKey = 'd1' | 'd2'
type SortDir = 'asc' | 'desc'

function Dot({ value, isD1 }: { value: number; isD1: boolean }) {
  return (
    <span
      className={`inline-block w-3 h-3 rounded-full ${dotColor(value, isD1)}`}
      style={{ boxShadow: '0 0 4px rgba(0,0,0,0.25)' }}
    />
  )
}

function Bar({ value, isD1 }: { value: number; isD1: boolean }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="w-11 bg-gray-200 rounded h-1.5">
        <div className={`${dotColor(value, isD1)} h-1.5 rounded`} style={{ width: `${value * 100}%` }} />
      </div>
      <span className={`text-xs ${textColor(value, isD1)}`}>{value.toFixed(2)}</span>
    </div>
  )
}

function Sub({ value, isD1 }: { value: number; isD1: boolean }) {
  return <span className={`text-xs ${textColor(value, isD1)}`}>{value.toFixed(2)}</span>
}

function Dash() {
  return <span className="text-xs text-gray-400">—</span>
}

export default function RectorCarrerasTable({
  carreras,
  iesId,
}: {
  carreras: CarreraKpi[]
  iesId: string
}) {
  const [sortKey, setSortKey] = useState<SortKey>('d1')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [simulando, setSimulando] = useState<string | null>(null)

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('desc') }
  }

  function arrow(key: SortKey) {
    if (sortKey !== key) return ' ↕'
    return sortDir === 'desc' ? ' ↓' : ' ↑'
  }

  const sorted = [...carreras].sort((a, b) => {
    const va = sortKey === 'd1' ? (a.kpi?.d1_obsolescencia.score ?? -1) : (a.kpi?.d2_oportunidades.score ?? -1)
    const vb = sortKey === 'd1' ? (b.kpi?.d1_obsolescencia.score ?? -1) : (b.kpi?.d2_oportunidades.score ?? -1)
    return sortDir === 'desc' ? vb - va : va - vb
  })

  const carreraSimulando = simulando ? carreras.find((c) => c.id === simulando) ?? null : null

  if (carreras.length === 0) {
    return <p className="text-gray-400 py-8 text-sm">Sin carreras registradas para esta IES.</p>
  }

  return (
    <>
      {carreraSimulando && (
        <SimuladorModal
          carrera={carreraSimulando}
          iesId={iesId}
          onClose={() => setSimulando(null)}
        />
      )}
      <div className="overflow-x-auto rounded border">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-xs text-center">
              <th className="px-3 py-2 border-b text-left" rowSpan={2}>Carrera</th>
              <th className="px-2 py-2 border-b text-right text-gray-500" rowSpan={2}>Matrícula</th>
              <th colSpan={5} className="px-2 py-1.5 border-b border-l-4 border-l-red-300 bg-red-50 text-red-800 tracking-wide">
                D1 — OBSOLESCENCIA
              </th>
              <th colSpan={5} className="px-2 py-1.5 border-b border-l-4 border-l-green-300 bg-green-50 text-green-800 tracking-wide">
                D2 — OPORTUNIDADES
              </th>
              <th className="px-2 py-2 border-b text-gray-500 text-xs" rowSpan={2}>Acción</th>
            </tr>
            <tr className="text-xs text-center text-gray-500 bg-gray-50">
              <th className="px-2 py-1 border-b border-l-4 border-l-red-300 bg-red-50">●</th>
              <th
                className="px-2 py-1 border-b bg-red-50 cursor-pointer hover:bg-red-100 select-none"
                onClick={() => handleSort('d1')}
              >
                {`Score${arrow('d1')}`}
              </th>
              <th className="px-2 py-1 border-b bg-red-50">IVA</th>
              <th className="px-2 py-1 border-b bg-red-50">BES</th>
              <th className="px-2 py-1 border-b bg-red-50">VAC</th>
              <th className="px-2 py-1 border-b border-l-4 border-l-green-300 bg-green-50">●</th>
              <th
                className="px-2 py-1 border-b bg-green-50 cursor-pointer hover:bg-green-100 select-none"
                onClick={() => handleSort('d2')}
              >
                {`Score${arrow('d2')}`}
              </th>
              <th className="px-2 py-1 border-b bg-green-50">IOE</th>
              <th className="px-2 py-1 border-b bg-green-50">IHE</th>
              <th className="px-2 py-1 border-b bg-green-50">IEA</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(({ id, nombre, matricula, kpi }) => {
              const d1 = kpi?.d1_obsolescencia
              const d2 = kpi?.d2_oportunidades
              return (
                <tr key={id} className="border-b hover:bg-gray-50 text-center">
                  <td className="px-3 py-2 text-left text-xs font-semibold text-gray-800">{nombre}</td>
                  <td className="px-3 py-2 text-right text-xs text-gray-500">{matricula ?? '—'}</td>
                  <td className="px-2 py-2 border-l-4 border-l-red-200 bg-red-50/50">
                    {d1 ? <Dot value={d1.score} isD1={true} /> : <Dash />}
                  </td>
                  <td className="px-2 py-2 bg-red-50/50">
                    {d1 ? <Bar value={d1.score} isD1={true} /> : <Dash />}
                  </td>
                  <td className="px-2 py-2 bg-red-50/50">
                    {d1 ? <Sub value={d1.iva} isD1={true} /> : <Dash />}
                  </td>
                  <td className="px-2 py-2 bg-red-50/50">
                    {d1 ? <Sub value={d1.bes} isD1={true} /> : <Dash />}
                  </td>
                  <td className="px-2 py-2 bg-red-50/50">
                    {d1 ? <Sub value={d1.vac} isD1={true} /> : <Dash />}
                  </td>
                  <td className="px-2 py-2 border-l-4 border-l-green-200 bg-green-50/50">
                    {d2 ? <Dot value={d2.score} isD1={false} /> : <Dash />}
                  </td>
                  <td className="px-2 py-2 bg-green-50/50">
                    {d2 ? <Bar value={d2.score} isD1={false} /> : <Dash />}
                  </td>
                  <td className="px-2 py-2 bg-green-50/50">
                    {d2 ? <Sub value={d2.ioe} isD1={false} /> : <Dash />}
                  </td>
                  <td className="px-2 py-2 bg-green-50/50">
                    {d2 ? <Sub value={d2.ihe} isD1={false} /> : <Dash />}
                  </td>
                  <td className="px-2 py-2 bg-green-50/50">
                    {d2 ? <Sub value={d2.iea} isD1={false} /> : <Dash />}
                  </td>
                  <td className="px-2 py-2">
                    <button
                      onClick={() => setSimulando(id)}
                      className="text-xs text-blue-600 hover:text-blue-800 whitespace-nowrap"
                    >
                      Simular →
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <p className="px-3 py-2 text-xs text-gray-400">
          <span className="text-red-600">● rojo</span> = alerta ·{' '}
          <span className="text-yellow-600">● amarillo</span> = medio ·{' '}
          <span className="text-green-600">● verde</span> = bueno &nbsp;(D1: alto=malo · D2: alto=bueno)
        </p>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Actualizar `frontend/src/components/RectorDashboard.tsx`**

Cambiar la línea:

```tsx
<RectorCarrerasTable carreras={data.carreras} />
```

por:

```tsx
<RectorCarrerasTable carreras={data.carreras} iesId={iesId} />
```

- [ ] **Step 3: Verificar TypeScript**

```bash
cd frontend && npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 4: Ejecutar todos los tests frontend**

```bash
cd frontend && npm test -- --watchAll=false
```

Expected: 30 passed (27 previos + 3 nuevos de SimuladorModal). Los tests existentes de `RectorDashboard.test.tsx` siguen pasando porque `RectorDashboard` ya tenía `iesId` prop y ahora se lo pasa a `RectorCarrerasTable`.

- [ ] **Step 5: Ejecutar todos los tests de backend**

```bash
python -m pytest tests/ -v
```

Expected: ≥14 passed.

- [ ] **Step 6: Commit final del sprint**

```bash
git add frontend/src/components/RectorCarrerasTable.tsx \
        frontend/src/components/RectorDashboard.tsx
git commit -m "feat: botón Simular → por fila, Sprint 7 completo"
```

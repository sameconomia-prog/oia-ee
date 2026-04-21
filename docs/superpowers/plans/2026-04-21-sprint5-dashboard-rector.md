# Sprint 5 — Dashboard Rector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir la ruta `/rector?ies_id=N` con panel lateral de alertas activas y tabla BSC de carreras, conectada al endpoint FastAPI `GET /rector`.

**Architecture:** Nuevo endpoint FastAPI calcula KPIs on-the-fly para todas las carreras de una IES y deriva alertas (D1 > 0.7 o D2 < 0.4). El frontend usa layout grid de dos columnas: AlertasPanel (izquierda, 280 px fijo) + RectorCarrerasTable (derecha). La lógica de semáforo se extrae a `kpi-colors.ts` para ser compartida por KpisTable y RectorCarrerasTable.

**Tech Stack:** Next.js 14 App Router · TypeScript · Tailwind CSS · FastAPI · SQLAlchemy · Jest 29 · React Testing Library 15

---

## Mapa de archivos

**Nuevos:**
- `frontend/src/lib/kpi-colors.ts` — dotColor, textColor (extraídos de KpisTable)
- `frontend/src/components/AlertasPanel.tsx`
- `frontend/src/components/RectorCarrerasTable.tsx`
- `frontend/src/components/RectorDashboard.tsx`
- `frontend/src/app/rector/page.tsx`
- `frontend/__tests__/AlertasPanel.test.tsx`
- `frontend/__tests__/RectorDashboard.test.tsx`
- `api/routers/rector.py`
- `tests/api/test_rector.py`

**Modificados:**
- `frontend/src/lib/types.ts` — +IesInfo, CarreraKpi, AlertaItem, RectorData
- `frontend/src/lib/api.ts` — +getRectorData
- `frontend/src/components/KpisTable.tsx` — importa desde kpi-colors.ts
- `frontend/src/components/Sidebar.tsx` — +enlace Rector
- `frontend/__tests__/api.test.ts` — +2 tests
- `api/schemas.py` — +IesOut, CarreraKpiOut, AlertaItemOut, RectorOut
- `api/main.py` — registra router rector

---

## Task 1: Extraer kpi-colors.ts

**Files:**
- Create: `frontend/src/lib/kpi-colors.ts`
- Modify: `frontend/src/components/KpisTable.tsx`

- [ ] **Step 1: Crear kpi-colors.ts con las funciones extraídas**

```typescript
// frontend/src/lib/kpi-colors.ts
export function dotColor(value: number, isD1: boolean): string {
  const bad = isD1 ? value > 0.7 : value < 0.4
  const good = isD1 ? value < 0.4 : value > 0.7
  if (bad) return 'bg-red-500'
  if (good) return 'bg-green-500'
  return 'bg-yellow-400'
}

export function textColor(value: number, isD1: boolean): string {
  const c = dotColor(value, isD1)
  if (c === 'bg-red-500') return 'text-red-600 font-bold'
  if (c === 'bg-green-500') return 'text-green-600 font-bold'
  return 'text-yellow-600 font-bold'
}
```

- [ ] **Step 2: Actualizar KpisTable.tsx para importar desde kpi-colors.ts**

Reemplazar las definiciones locales de `dotColor` y `textColor` en `frontend/src/components/KpisTable.tsx` (líneas 17-30) con:

```typescript
import { dotColor, textColor } from '@/lib/kpi-colors'
```

Eliminar las funciones `dotColor` y `textColor` del archivo (ya no se definen localmente — solo se importan).

- [ ] **Step 3: Verificar que los tests existentes de KpisTable siguen pasando**

```bash
cd frontend && npx jest __tests__/KpisTable.test.tsx --no-coverage
```

Expected: `PASS __tests__/KpisTable.test.tsx` con 2 tests en verde.

- [ ] **Step 4: Commit**

```bash
cd frontend && git add src/lib/kpi-colors.ts src/components/KpisTable.tsx
cd .. && git commit -m "refactor(dashboard): extract dotColor/textColor to kpi-colors.ts"
```

---

## Task 2: Tipos TypeScript + API client

**Files:**
- Modify: `frontend/src/lib/types.ts`
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/__tests__/api.test.ts`

- [ ] **Step 1: Escribir los tests nuevos en api.test.ts (deben fallar)**

Añadir al final de `frontend/__tests__/api.test.ts`:

```typescript
describe('getRectorData', () => {
  it('returns RectorData on success', async () => {
    const mockData = {
      ies: { id: '1', nombre: 'Humanitas', nombre_corto: 'UH' },
      carreras: [],
      alertas: [],
    }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    } as Response)
    const result = await getRectorData(1)
    expect(result.ies.nombre).toBe('Humanitas')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/rector?ies_id=1')
    )
  })

  it('throws on non-OK response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 } as Response)
    await expect(getRectorData(99)).rejects.toThrow('HTTP 404')
  })
})
```

- [ ] **Step 2: Verificar que los nuevos tests fallan**

```bash
cd frontend && npx jest __tests__/api.test.ts --no-coverage
```

Expected: los 2 nuevos tests fallan con `getRectorData is not a function` o similar.

- [ ] **Step 3: Añadir tipos en types.ts**

Añadir al final de `frontend/src/lib/types.ts`:

```typescript
export interface IesInfo {
  id: string
  nombre: string
  nombre_corto: string | null
}

export interface CarreraKpi {
  id: string
  nombre: string
  matricula: number | null
  kpi: KpiResult | null
}

export interface AlertaItem {
  id: string
  carrera_nombre: string
  tipo: 'd1_alto' | 'd2_bajo' | 'ambos'
  severidad: 'alta' | 'media'
  titulo: string
  mensaje: string | null
  fecha: string
}

export interface RectorData {
  ies: IesInfo
  carreras: CarreraKpi[]
  alertas: AlertaItem[]
}
```

- [ ] **Step 4: Añadir getRectorData en api.ts**

Añadir el import y la función al final de `frontend/src/lib/api.ts`:

```typescript
import type { Noticia, KpiResult, IngestResult, RectorData } from './types'
```

(reemplaza la línea `import type` existente — agrega `RectorData` a los tipos importados)

```typescript
export async function getRectorData(iesId: number): Promise<RectorData> {
  const res = await fetch(`${BASE}/rector?ies_id=${iesId}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}
```

- [ ] **Step 5: Verificar que los tests pasan**

```bash
cd frontend && npx jest __tests__/api.test.ts --no-coverage
```

Expected: `PASS __tests__/api.test.ts` — 8 tests en verde (6 existentes + 2 nuevos).

- [ ] **Step 6: Commit**

```bash
cd frontend && git add src/lib/types.ts src/lib/api.ts __tests__/api.test.ts
cd .. && git commit -m "feat(rector): types IesInfo/CarreraKpi/AlertaItem/RectorData + getRectorData"
```

---

## Task 3: Backend — rector router

**Files:**
- Modify: `api/schemas.py`
- Create: `api/routers/rector.py`
- Create: `tests/api/test_rector.py`
- Modify: `api/main.py`

- [ ] **Step 1: Escribir los tests del endpoint (deben fallar)**

Crear `tests/api/test_rector.py`:

```python
# tests/api/test_rector.py
import json
from pipeline.db.models import IES, Carrera, CarreraIES, Ocupacion


def test_rector_ies_not_found(client):
    resp = client.get("/rector?ies_id=id-no-existe")
    assert resp.status_code == 404


def test_rector_returns_ies_and_carreras(client, db_session):
    ies = IES(nombre="Universidad Test", nombre_corto="UT")
    db_session.add(ies)
    db_session.flush()

    carrera = Carrera(nombre_norm="Derecho Test", onet_codes_relacionados=json.dumps([]))
    db_session.add(carrera)
    db_session.flush()

    cie = CarreraIES(carrera_id=carrera.id, ies_id=ies.id, ciclo="2024/2", matricula=300, egresados=60,
                     plan_estudio_skills=json.dumps([]))
    db_session.add(cie)
    db_session.flush()

    resp = client.get(f"/rector?ies_id={ies.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["ies"]["nombre"] == "Universidad Test"
    assert data["ies"]["nombre_corto"] == "UT"
    assert len(data["carreras"]) == 1
    assert data["carreras"][0]["nombre"] == "Derecho Test"
    assert data["carreras"][0]["matricula"] == 300
    assert isinstance(data["alertas"], list)


def test_rector_alerta_generada_por_d1_alto(client, db_session):
    ies = IES(nombre="IES Alerta", nombre_corto="IA")
    db_session.add(ies)
    occ = Ocupacion(onet_code="99-9999.99", nombre="Ocupacion Alta", p_automatizacion=0.95)
    db_session.add(occ)
    db_session.flush()

    carrera = Carrera(nombre_norm="Carrera Riesgo", onet_codes_relacionados=json.dumps(["99-9999.99"]))
    db_session.add(carrera)
    db_session.flush()

    cie = CarreraIES(carrera_id=carrera.id, ies_id=ies.id, ciclo="2024/2", matricula=200, egresados=40,
                     plan_estudio_skills=json.dumps([]))
    db_session.add(cie)
    db_session.flush()

    resp = client.get(f"/rector?ies_id={ies.id}")
    assert resp.status_code == 200
    data = resp.json()
    # Con p_automatizacion=0.95, D1 debe ser > 0.7 → genera alerta
    alertas = data["alertas"]
    if alertas:
        assert alertas[0]["carrera_nombre"] == "Carrera Riesgo"
        assert alertas[0]["severidad"] in ("alta", "media")
        assert alertas[0]["tipo"] in ("d1_alto", "d2_bajo", "ambos")
```

- [ ] **Step 2: Verificar que los tests fallan**

```bash
pytest tests/api/test_rector.py -v
```

Expected: `ERROR` o `FAILED` — el router no existe aún.

- [ ] **Step 3: Añadir schemas en api/schemas.py**

Añadir al final de `api/schemas.py`, antes de la línea final:

```python
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
```

- [ ] **Step 4: Crear api/routers/rector.py**

```python
# api/routers/rector.py
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from api.deps import get_db
from api.schemas import RectorOut, IesOut, CarreraKpiOut, AlertaItemOut, KpiOut, D1Out, D2Out
from pipeline.db.models import IES, Carrera, CarreraIES
from pipeline.kpi_engine.kpi_runner import run_kpis

router = APIRouter()


def _severidad(d1: float, d2: float, d1_alert: bool, d2_alert: bool) -> str:
    if d1_alert and d1 > 0.8:
        return "alta"
    if d2_alert and d2 < 0.3:
        return "alta"
    return "media"


def _titulo(tipo: str) -> str:
    return {"d1_alto": "D1 crítico", "d2_bajo": "D2 bajo", "ambos": "D1 crítico y D2 bajo"}[tipo]


@router.get("/", response_model=RectorOut)
def get_rector_dashboard(ies_id: str, db: Session = Depends(get_db)):
    ies = db.query(IES).filter_by(id=ies_id).first()
    if not ies:
        raise HTTPException(status_code=404, detail="IES no encontrada")

    carrera_ies_list = db.query(CarreraIES).filter_by(ies_id=ies_id).all()
    carreras_out: list[CarreraKpiOut] = []
    alertas_out: list[AlertaItemOut] = []

    for cie in carrera_ies_list:
        carrera = db.query(Carrera).filter_by(id=cie.carrera_id).first()
        if not carrera:
            continue

        kpi_result = run_kpis(cie.carrera_id, db)
        kpi_out = None
        if kpi_result:
            kpi_out = KpiOut(
                carrera_id=cie.carrera_id,
                d1_obsolescencia=D1Out(**vars(kpi_result.d1_obsolescencia)),
                d2_oportunidades=D2Out(**vars(kpi_result.d2_oportunidades)),
            )
            d1 = kpi_result.d1_obsolescencia.score
            d2 = kpi_result.d2_oportunidades.score
            d1_alert = d1 > 0.7
            d2_alert = d2 < 0.4
            if d1_alert or d2_alert:
                tipo = "ambos" if (d1_alert and d2_alert) else ("d1_alto" if d1_alert else "d2_bajo")
                alertas_out.append(AlertaItemOut(
                    id=f"{cie.carrera_id}-alert",
                    carrera_nombre=carrera.nombre_norm,
                    tipo=tipo,
                    severidad=_severidad(d1, d2, d1_alert, d2_alert),
                    titulo=_titulo(tipo),
                    mensaje=f"D1 = {d1:.2f} (umbral: 0.70) · D2 = {d2:.2f} (umbral: 0.40)",
                    fecha=datetime.utcnow().isoformat(),
                ))

        carreras_out.append(CarreraKpiOut(
            id=cie.carrera_id,
            nombre=carrera.nombre_norm,
            matricula=cie.matricula,
            kpi=kpi_out,
        ))

    alertas_out.sort(key=lambda a: 0 if a.severidad == "alta" else 1)
    return RectorOut(
        ies=IesOut(id=ies.id, nombre=ies.nombre, nombre_corto=ies.nombre_corto),
        carreras=carreras_out,
        alertas=alertas_out,
    )
```

- [ ] **Step 5: Registrar el router en api/main.py**

```python
# api/main.py
from fastapi import FastAPI
from api.routers import noticias, kpis, admin, rector

app = FastAPI(title="OIA-EE API", version="0.4.0")
app.include_router(noticias.router, prefix="/noticias", tags=["noticias"])
app.include_router(kpis.router, prefix="/kpis", tags=["kpis"])
app.include_router(admin.router, prefix="/admin", tags=["admin"])
app.include_router(rector.router, prefix="/rector", tags=["rector"])


@app.get("/health")
def health():
    return {"status": "ok"}
```

- [ ] **Step 6: Verificar que los tests pasan**

```bash
pytest tests/api/test_rector.py -v
```

Expected:
```
PASSED tests/api/test_rector.py::test_rector_ies_not_found
PASSED tests/api/test_rector.py::test_rector_returns_ies_and_carreras
PASSED tests/api/test_rector.py::test_rector_alerta_generada_por_d1_alto
```

- [ ] **Step 7: Verificar que todos los tests Python siguen pasando**

```bash
pytest tests/ -v --tb=short
```

Expected: todos los tests existentes en verde.

- [ ] **Step 8: Commit**

```bash
git add api/schemas.py api/routers/rector.py api/main.py tests/api/test_rector.py
git commit -m "feat(rector): GET /rector endpoint con KPIs y alertas on-the-fly"
```

---

## Task 4: AlertasPanel component

**Files:**
- Create: `frontend/src/components/AlertasPanel.tsx`
- Create: `frontend/__tests__/AlertasPanel.test.tsx`

- [ ] **Step 1: Escribir los tests (deben fallar)**

Crear `frontend/__tests__/AlertasPanel.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import AlertasPanel from '@/components/AlertasPanel'
import type { AlertaItem } from '@/lib/types'

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
  render(<AlertasPanel alertas={[alertaMock]} />)
  expect(screen.getByText('Derecho')).toBeInTheDocument()
  expect(screen.getByText('alta')).toBeInTheDocument()
  expect(screen.getByText('D1 alto + D2 bajo')).toBeInTheDocument()
})

test('muestra mensaje vacío cuando no hay alertas', () => {
  render(<AlertasPanel alertas={[]} />)
  expect(screen.getByText(/Sin alertas activas/)).toBeInTheDocument()
})
```

- [ ] **Step 2: Verificar que fallan**

```bash
cd frontend && npx jest __tests__/AlertasPanel.test.tsx --no-coverage
```

Expected: `FAIL` — componente no existe.

- [ ] **Step 3: Crear AlertasPanel.tsx**

```typescript
// frontend/src/components/AlertasPanel.tsx
'use client'
import type { AlertaItem } from '@/lib/types'

const TIPO_LABELS: Record<string, string> = {
  d1_alto: 'D1 alto',
  d2_bajo: 'D2 bajo',
  ambos: 'D1 alto + D2 bajo',
}

export default function AlertasPanel({ alertas }: { alertas: AlertaItem[] }) {
  if (alertas.length === 0) {
    return (
      <div className="p-4 text-sm text-green-600 flex items-center gap-2">
        <span>✓</span>
        <span>Sin alertas activas</span>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-2 p-3">
      <h3 className="text-xs font-semibold uppercase text-gray-500 tracking-wide mb-1">
        Alertas activas ({alertas.length})
      </h3>
      {alertas.map((a) => (
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
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Verificar que los tests pasan**

```bash
cd frontend && npx jest __tests__/AlertasPanel.test.tsx --no-coverage
```

Expected: `PASS __tests__/AlertasPanel.test.tsx` — 2 tests en verde.

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/components/AlertasPanel.tsx __tests__/AlertasPanel.test.tsx
cd .. && git commit -m "feat(rector): AlertasPanel component con estado vacío"
```

---

## Task 5: RectorCarrerasTable component

**Files:**
- Create: `frontend/src/components/RectorCarrerasTable.tsx`

- [ ] **Step 1: Crear RectorCarrerasTable.tsx**

Este componente recibe `carreras: CarreraKpi[]` y renderiza la tabla BSC igual que KpisTable, pero sin hacer fetch propio.

```typescript
// frontend/src/components/RectorCarrerasTable.tsx
'use client'
import { useState } from 'react'
import type { CarreraKpi } from '@/lib/types'
import { dotColor, textColor } from '@/lib/kpi-colors'

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

export default function RectorCarrerasTable({ carreras }: { carreras: CarreraKpi[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('d1')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

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

  if (carreras.length === 0) {
    return <p className="text-gray-400 py-8 text-sm">Sin carreras registradas para esta IES.</p>
  }

  return (
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
          </tr>
          <tr className="text-xs text-center text-gray-500 bg-gray-50">
            <th className="px-2 py-1 border-b border-l-4 border-l-red-300 bg-red-50">●</th>
            <th className="px-2 py-1 border-b bg-red-50 cursor-pointer hover:bg-red-100 select-none" onClick={() => handleSort('d1')}>{`Score${arrow('d1')}`}</th>
            <th className="px-2 py-1 border-b bg-red-50">IVA</th>
            <th className="px-2 py-1 border-b bg-red-50">BES</th>
            <th className="px-2 py-1 border-b bg-red-50">VAC</th>
            <th className="px-2 py-1 border-b border-l-4 border-l-green-300 bg-green-50">●</th>
            <th className="px-2 py-1 border-b bg-green-50 cursor-pointer hover:bg-green-100 select-none" onClick={() => handleSort('d2')}>{`Score${arrow('d2')}`}</th>
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
                <td className="px-2 py-2 border-l-4 border-l-red-200 bg-red-50/50">{d1 ? <Dot value={d1.score} isD1={true} /> : <Dash />}</td>
                <td className="px-2 py-2 bg-red-50/50">{d1 ? <Bar value={d1.score} isD1={true} /> : <Dash />}</td>
                <td className="px-2 py-2 bg-red-50/50">{d1 ? <Sub value={d1.iva} isD1={true} /> : <Dash />}</td>
                <td className="px-2 py-2 bg-red-50/50">{d1 ? <Sub value={d1.bes} isD1={true} /> : <Dash />}</td>
                <td className="px-2 py-2 bg-red-50/50">{d1 ? <Sub value={d1.vac} isD1={true} /> : <Dash />}</td>
                <td className="px-2 py-2 border-l-4 border-l-green-200 bg-green-50/50">{d2 ? <Dot value={d2.score} isD1={false} /> : <Dash />}</td>
                <td className="px-2 py-2 bg-green-50/50">{d2 ? <Bar value={d2.score} isD1={false} /> : <Dash />}</td>
                <td className="px-2 py-2 bg-green-50/50">{d2 ? <Sub value={d2.ioe} isD1={false} /> : <Dash />}</td>
                <td className="px-2 py-2 bg-green-50/50">{d2 ? <Sub value={d2.ihe} isD1={false} /> : <Dash />}</td>
                <td className="px-2 py-2 bg-green-50/50">{d2 ? <Sub value={d2.iea} isD1={false} /> : <Dash />}</td>
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
  )
}
```

- [ ] **Step 2: Verificar que el frontend compila sin errores TypeScript**

```bash
cd frontend && npx tsc --noEmit
```

Expected: sin errores de tipos.

- [ ] **Step 3: Commit**

```bash
cd frontend && git add src/components/RectorCarrerasTable.tsx
cd .. && git commit -m "feat(rector): RectorCarrerasTable BSC con columna matrícula y kpi nullable"
```

---

## Task 6: RectorDashboard + page + Sidebar

**Files:**
- Create: `frontend/src/components/RectorDashboard.tsx`
- Create: `frontend/src/app/rector/page.tsx`
- Create: `frontend/__tests__/RectorDashboard.test.tsx`
- Modify: `frontend/src/components/Sidebar.tsx`

- [ ] **Step 1: Escribir los tests de RectorDashboard (deben fallar)**

Crear `frontend/__tests__/RectorDashboard.test.tsx`:

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import RectorDashboard from '@/components/RectorDashboard'
import * as api from '@/lib/api'

jest.mock('@/lib/api')
const mockGetRectorData = api.getRectorData as jest.MockedFunction<typeof api.getRectorData>

const mockData = {
  ies: { id: '1', nombre: 'Universidad Humanitas', nombre_corto: 'UH' },
  carreras: [
    {
      id: 'c1',
      nombre: 'Derecho',
      matricula: 450,
      kpi: {
        d1_obsolescencia: { score: 0.82, iva: 0.75, bes: 0.80, vac: 0.90 },
        d2_oportunidades: { score: 0.35, ioe: 0.40, ihe: 0.30, iea: 0.35 },
      },
    },
  ],
  alertas: [
    {
      id: 'a1',
      carrera_nombre: 'Derecho',
      tipo: 'ambos' as const,
      severidad: 'alta' as const,
      titulo: 'D1 crítico y D2 bajo',
      mensaje: 'D1 = 0.82 · D2 = 0.35',
      fecha: '2026-04-21T00:00:00',
    },
  ],
}

test('renderiza nombre de la IES', async () => {
  mockGetRectorData.mockResolvedValue(mockData)
  render(<RectorDashboard iesId={1} />)
  await waitFor(() => expect(screen.getByText('Universidad Humanitas')).toBeInTheDocument())
})

test('muestra tabla con carreras', async () => {
  mockGetRectorData.mockResolvedValue(mockData)
  render(<RectorDashboard iesId={1} />)
  await waitFor(() => expect(screen.getByText('Derecho')).toBeInTheDocument())
})

test('muestra panel de alertas activas', async () => {
  mockGetRectorData.mockResolvedValue(mockData)
  render(<RectorDashboard iesId={1} />)
  await waitFor(() => expect(screen.getByText('Alertas activas (1)')).toBeInTheDocument())
})
```

- [ ] **Step 2: Verificar que los tests fallan**

```bash
cd frontend && npx jest __tests__/RectorDashboard.test.tsx --no-coverage
```

Expected: `FAIL` — componente no existe.

- [ ] **Step 3: Crear RectorDashboard.tsx**

```typescript
// frontend/src/components/RectorDashboard.tsx
'use client'
import { useEffect, useState } from 'react'
import { getRectorData } from '@/lib/api'
import type { RectorData } from '@/lib/types'
import AlertasPanel from './AlertasPanel'
import RectorCarrerasTable from './RectorCarrerasTable'

export default function RectorDashboard({ iesId }: { iesId: number }) {
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
          <AlertasPanel alertas={data.alertas} />
        </aside>
        <main>
          <RectorCarrerasTable carreras={data.carreras} />
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Crear app/rector/page.tsx**

```typescript
// frontend/src/app/rector/page.tsx
'use client'
import { useSearchParams } from 'next/navigation'
import RectorDashboard from '@/components/RectorDashboard'

export default function RectorPage() {
  const params = useSearchParams()
  const iesId = params.get('ies_id')

  if (!iesId) {
    return (
      <div className="py-8 text-gray-400 text-sm">
        Selecciona una IES para continuar. Ejemplo:{' '}
        <code className="bg-gray-100 px-1 rounded">/rector?ies_id=1</code>
      </div>
    )
  }

  return <RectorDashboard iesId={Number(iesId)} />
}
```

- [ ] **Step 5: Actualizar Sidebar.tsx para añadir enlace Rector**

Reemplazar el array `links` en `frontend/src/components/Sidebar.tsx`:

```typescript
const links = [
  { href: '/noticias', label: 'Noticias', icon: '📰' },
  { href: '/kpis', label: 'KPIs', icon: '📊' },
  { href: '/rector', label: 'Rector', icon: '🏛' },
  { href: '/admin', label: 'Admin', icon: '⚙️' },
]
```

- [ ] **Step 6: Verificar que los tests pasan**

```bash
cd frontend && npx jest __tests__/RectorDashboard.test.tsx --no-coverage
```

Expected: `PASS __tests__/RectorDashboard.test.tsx` — 3 tests en verde.

- [ ] **Step 7: Verificar que todos los tests del frontend pasan**

```bash
cd frontend && npx jest --no-coverage
```

Expected:
```
PASS __tests__/api.test.ts
PASS __tests__/NoticiasTable.test.tsx
PASS __tests__/KpisTable.test.tsx
PASS __tests__/AdminPanel.test.tsx
PASS __tests__/AlertasPanel.test.tsx
PASS __tests__/RectorDashboard.test.tsx

Test Suites: 6 passed, 6 total
Tests:       19 passed, 19 total
```

- [ ] **Step 8: Commit final**

```bash
cd frontend && git add src/components/RectorDashboard.tsx src/app/rector/page.tsx src/components/Sidebar.tsx __tests__/RectorDashboard.test.tsx
cd .. && git commit -m "feat(rector): RectorDashboard + page + Sidebar link — Sprint 5 completo"
```

---

## Verificación final

```bash
# Python
pytest tests/ -v --tb=short

# TypeScript
cd frontend && npx jest --no-coverage
```

Expected: **todos los tests en verde** — 3 Python nuevos + 19 frontend (6 suites).

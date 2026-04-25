# Sprint 24 — Panel de Comparación Pública de IES

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar endpoint público `/publico/ies` y página `/comparar` que permite comparar D4 de dos IES lado a lado.

**Architecture:** Backend: 1 nuevo endpoint en `publico.py` (sin auth). Frontend: nueva página Client Component + nuevo componente `ComparacionIES`. Reutiliza `getKpisIes` existente para los datos D4; solo se agrega `getPublicoIes` para el listado. Link en Sidebar.

**Tech Stack:** FastAPI, SQLAlchemy, pytest (backend); Next.js 14 App Router, TypeScript, React hooks (frontend)

---

## Mapa de archivos

| Archivo | Acción |
|---------|--------|
| `api/routers/publico.py` | Agregar `GET /publico/ies` |
| `tests/api/test_publico.py` | Agregar 2 tests |
| `frontend/src/lib/api.ts` | Agregar `getPublicoIes()` |
| `frontend/src/app/comparar/page.tsx` | Crear (Client Component) |
| `frontend/src/components/ComparacionIES.tsx` | Crear |
| `frontend/src/components/Sidebar.tsx` | Agregar link "Comparar" |

---

## Task 1: Backend — `GET /publico/ies`

**Files:**
- Modify: `api/routers/publico.py`
- Modify: `tests/api/test_publico.py`

- [ ] **Paso 1: Escribir tests que fallan**

Abrir `tests/api/test_publico.py`. Al final del archivo agregar:

```python
# --- GET /publico/ies ---

def test_listar_ies_publico_sin_auth(client, db_session):
    db_session.add(IES(nombre="Universidad Comparar A", nombre_corto="UCA", activa=True))
    db_session.add(IES(nombre="Universidad Comparar B", nombre_corto="UCB", activa=True))
    db_session.flush()
    resp = client.get("/publico/ies")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    nombres = [d["nombre"] for d in data]
    assert "Universidad Comparar A" in nombres
    assert "Universidad Comparar B" in nombres
    assert "id" in data[0]


def test_listar_ies_publico_solo_activas(client, db_session):
    db_session.add(IES(nombre="IES Activa", nombre_corto="IA", activa=True))
    db_session.add(IES(nombre="IES Inactiva", nombre_corto="II", activa=False))
    db_session.flush()
    resp = client.get("/publico/ies")
    assert resp.status_code == 200
    data = resp.json()
    nombres = [d["nombre"] for d in data]
    assert "IES Activa" in nombres
    assert "IES Inactiva" not in nombres
```

- [ ] **Paso 2: Correr tests — deben FALLAR**

```bash
cd ~/Documents/OIA-EE
source pipeline/.venv/bin/activate
python -m pytest tests/api/test_publico.py::test_listar_ies_publico_sin_auth tests/api/test_publico.py::test_listar_ies_publico_solo_activas -v
```

Salida esperada: `FAILED` (404 — endpoint no existe).

- [ ] **Paso 3: Implementar el endpoint en `api/routers/publico.py`**

Agregar al final del archivo (después de `listar_carreras_publico`):

```python
@router.get("/ies", response_model=list[IesOut])
def listar_ies_publico(db: Session = Depends(get_db)):
    ies_list = db.query(IES).filter_by(activa=True).order_by(IES.nombre).all()
    return [IesOut(id=i.id, nombre=i.nombre, nombre_corto=i.nombre_corto) for i in ies_list]
```

**Importante:** `IesOut` ya está importado en `api/schemas.py` pero hay que verificar que se importe en `publico.py`. El import existente en `publico.py` línea 7 es:

```python
from api.schemas import NoticiaOut, CarreraKpiOut, KpiOut, D1Out, D2Out, D3Out, D6Out
```

Agregar `IesOut` a ese import:

```python
from api.schemas import NoticiaOut, CarreraKpiOut, KpiOut, D1Out, D2Out, D3Out, D6Out, IesOut
```

- [ ] **Paso 4: Correr tests — deben PASAR**

```bash
python -m pytest tests/api/test_publico.py::test_listar_ies_publico_sin_auth tests/api/test_publico.py::test_listar_ies_publico_solo_activas -v
```

Salida esperada: `2 passed`

- [ ] **Paso 5: Suite completa — sin regresiones**

```bash
python -m pytest tests/ -q 2>&1 | tail -3
```

Salida esperada: `172 passed`

- [ ] **Paso 6: Commit**

```bash
git add api/routers/publico.py tests/api/test_publico.py
git commit -m "feat: GET /publico/ies — lista IES activas sin auth (Sprint 24)"
```

---

## Task 2: Frontend — `getPublicoIes` + `ComparacionIES` + página

**Files:**
- Modify: `frontend/src/lib/api.ts`
- Create: `frontend/src/components/ComparacionIES.tsx`
- Create: `frontend/src/app/comparar/page.tsx`
- Modify: `frontend/src/components/Sidebar.tsx`

- [ ] **Paso 1: Agregar `getPublicoIes` a `api.ts`**

Abrir `frontend/src/lib/api.ts`. Agregar después de `getKpisIes`:

```typescript
export async function getPublicoIes(): Promise<{ id: string; nombre: string; nombre_corto?: string }[]> {
  const res = await fetch(`${BASE}/publico/ies`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}
```

- [ ] **Paso 2: Crear `ComparacionIES.tsx`**

Crear el archivo `frontend/src/components/ComparacionIES.tsx` con este contenido exacto:

```tsx
'use client'
import { useState, useEffect } from 'react'
import { getKpisIes } from '@/lib/api'
import type { D4Result } from '@/lib/types'

const METRICAS: { key: keyof D4Result; label: string; titulo: string; invert: boolean }[] = [
  { key: 'score', label: 'Score D4', titulo: 'Score general institucional', invert: false },
  { key: 'tra', label: 'TRA — Retención', titulo: 'Tasa Retención-Absorción', invert: false },
  { key: 'irf', label: 'IRF — Riesgo Fin.', titulo: 'Índice Riesgo Financiero (menor=mejor)', invert: true },
  { key: 'cad', label: 'CAD — Actualización', titulo: 'Cobertura Actualización Digital', invert: false },
]

function gana(a: number, b: number, invert: boolean): 'a' | 'b' | 'empate' {
  const diff = Math.abs(a - b)
  if (diff < 0.001) return 'empate'
  if (invert) return a < b ? 'a' : 'b'
  return a > b ? 'a' : 'b'
}

export default function ComparacionIES({
  iesAId, iesBId, iesANombre, iesBNombre,
}: {
  iesAId: string
  iesBId: string
  iesANombre: string
  iesBNombre: string
}) {
  const [d4A, setD4A] = useState<D4Result | null>(null)
  const [d4B, setD4B] = useState<D4Result | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setD4A(null)
    setD4B(null)
    Promise.all([getKpisIes(iesAId), getKpisIes(iesBId)])
      .then(([resA, resB]) => {
        setD4A(resA?.d4_institucional ?? null)
        setD4B(resB?.d4_institucional ?? null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [iesAId, iesBId])

  if (loading) return <p className="text-sm text-gray-400 text-center py-8">Cargando...</p>
  if (!d4A || !d4B) return <p className="text-sm text-red-400 text-center py-8">Error cargando datos.</p>

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="grid grid-cols-3 bg-gray-800 text-white text-sm font-semibold">
        <div className="px-4 py-3">Métrica</div>
        <div className="px-4 py-3 text-center border-l border-gray-700 truncate" title={iesANombre}>
          {iesANombre}
        </div>
        <div className="px-4 py-3 text-center border-l border-gray-700 truncate" title={iesBNombre}>
          {iesBNombre}
        </div>
      </div>

      {METRICAS.map(({ key, label, titulo, invert }) => {
        const vA = d4A[key]
        const vB = d4B[key]
        const ganador = gana(vA, vB, invert)
        const bgA = ganador === 'a' ? 'bg-green-50 font-bold text-green-800' : 'text-gray-700'
        const bgB = ganador === 'b' ? 'bg-green-50 font-bold text-green-800' : 'text-gray-700'
        return (
          <div key={key} className="grid grid-cols-3 border-t text-sm">
            <div className="px-4 py-3 text-gray-500 text-xs" title={titulo}>{label}</div>
            <div className={`px-4 py-3 text-center border-l font-mono ${bgA}`}>
              {vA.toFixed(2)}{ganador === 'a' && ' ✓'}
            </div>
            <div className={`px-4 py-3 text-center border-l font-mono ${bgB}`}>
              {vB.toFixed(2)}{ganador === 'b' && ' ✓'}
            </div>
          </div>
        )
      })}

      <p className="text-xs text-gray-400 px-4 py-2 bg-gray-50 border-t">
        D4 Institucional · ✓ indica mejor valor · IRF: menor es mejor
      </p>
    </div>
  )
}
```

- [ ] **Paso 3: Crear `comparar/page.tsx`**

Crear el directorio y archivo `frontend/src/app/comparar/page.tsx`:

```tsx
'use client'
import { useState, useEffect } from 'react'
import { getPublicoIes } from '@/lib/api'
import ComparacionIES from '@/components/ComparacionIES'

type IesOpcion = { id: string; nombre: string; nombre_corto?: string }

export default function CompararPage() {
  const [ies, setIes] = useState<IesOpcion[]>([])
  const [iesAId, setIesAId] = useState('')
  const [iesBId, setIesBId] = useState('')

  useEffect(() => {
    getPublicoIes().then(setIes).catch(() => setIes([]))
  }, [])

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Comparar Instituciones</h1>
      <p className="text-sm text-gray-500 mb-6">
        Compara el índice D4 institucional entre dos IES.
      </p>

      <div className="flex gap-4 mb-8">
        {(['A', 'B'] as const).map((letra, i) => {
          const val = i === 0 ? iesAId : iesBId
          const set = i === 0 ? setIesAId : setIesBId
          return (
            <div key={letra} className="flex-1">
              <label className="block text-sm font-medium text-gray-600 mb-1">IES {letra}</label>
              <select
                value={val}
                onChange={e => set(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">— Seleccionar —</option>
                {ies.map(op => (
                  <option key={op.id} value={op.id}>{op.nombre_corto ?? op.nombre}</option>
                ))}
              </select>
            </div>
          )
        })}
      </div>

      {iesAId && iesBId && iesAId !== iesBId ? (
        <ComparacionIES
          iesAId={iesAId}
          iesBId={iesBId}
          iesANombre={ies.find(i => i.id === iesAId)?.nombre ?? iesAId}
          iesBNombre={ies.find(i => i.id === iesBId)?.nombre ?? iesBId}
        />
      ) : (
        <p className="text-sm text-gray-400 text-center py-12">
          Selecciona dos instituciones distintas para comparar.
        </p>
      )}
    </div>
  )
}
```

- [ ] **Paso 4: Agregar link "Comparar" en `Sidebar.tsx`**

Abrir `frontend/src/components/Sidebar.tsx`. El array `links` actual es:

```tsx
const links = [
  { href: '/', label: 'Inicio', icon: '🏠' },
  { href: '/noticias', label: 'Noticias', icon: '📰' },
  { href: '/kpis', label: 'KPIs', icon: '📊' },
  { href: '/rector', label: 'Rector', icon: '🏛' },
  { href: '/admin', label: 'Admin', icon: '⚙️' },
]
```

Reemplazar con:

```tsx
const links = [
  { href: '/', label: 'Inicio', icon: '🏠' },
  { href: '/noticias', label: 'Noticias', icon: '📰' },
  { href: '/kpis', label: 'KPIs', icon: '📊' },
  { href: '/comparar', label: 'Comparar', icon: '⚖️' },
  { href: '/rector', label: 'Rector', icon: '🏛' },
  { href: '/admin', label: 'Admin', icon: '⚙️' },
]
```

- [ ] **Paso 5: TypeScript check — 0 errores**

```bash
cd ~/Documents/OIA-EE/frontend
./node_modules/.bin/tsc -p tsconfig.json --noEmit
```

Salida esperada: sin output.

- [ ] **Paso 6: Python tests — sin regresiones**

```bash
cd ~/Documents/OIA-EE
source pipeline/.venv/bin/activate
python -m pytest tests/ -q 2>&1 | tail -3
```

Salida esperada: `172 passed`

- [ ] **Paso 7: Commit**

```bash
cd ~/Documents/OIA-EE
git add frontend/src/lib/api.ts frontend/src/components/ComparacionIES.tsx frontend/src/app/comparar/page.tsx frontend/src/components/Sidebar.tsx
git commit -m "feat: página /comparar con ComparacionIES lado a lado (Sprint 24)"
```

---

## Criterios de éxito finales

- [ ] `python -m pytest tests/ -q` → 172 passed
- [ ] `tsc --noEmit` → 0 errores
- [ ] `GET /publico/ies` responde 200 sin auth
- [ ] Link "Comparar" visible en Sidebar
- [ ] Página `/comparar` muestra dos selectores de IES
- [ ] Al seleccionar dos IES distintas: tabla 4 filas con ganador marcado ✓ en verde
- [ ] Mismo IES seleccionado en ambos → muestra hint "Selecciona dos instituciones distintas"

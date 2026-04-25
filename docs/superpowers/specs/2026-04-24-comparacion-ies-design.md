# Sprint 24 — Panel de Comparación Pública de IES

**Fecha:** 2026-04-24  
**Estado:** Aprobado

## Problema

No existe forma de comparar dos IES públicamente. Los visitantes solo pueden ver KPIs de carreras. Esta feature agrega una página `/comparar` donde cualquier usuario puede comparar el D4 de dos instituciones lado a lado.

## Alcance

1. `GET /publico/ies` — endpoint sin auth que lista IES activas
2. `getPublicoIes()` en `api.ts`
3. Página `/comparar` con dos selectores de IES
4. Componente `ComparacionIES` con display lado a lado + ganador por métrica
5. Link "Comparar" en el Sidebar
6. 2 tests para el nuevo endpoint

## Fuera de alcance

- Compartir URL de comparación (query params)
- Comparar más de 2 IES
- Comparar D1-D7 completo (solo D4)
- Paginación del selector de IES

## Archivos

| Archivo | Acción |
|---------|--------|
| `api/routers/publico.py` | Agregar `GET /publico/ies` |
| `tests/api/test_publico.py` | Agregar 2 tests |
| `frontend/src/lib/api.ts` | Agregar `getPublicoIes()` |
| `frontend/src/app/comparar/page.tsx` | Crear |
| `frontend/src/components/ComparacionIES.tsx` | Crear |
| `frontend/src/components/Sidebar.tsx` | Agregar link |

## Diseño Backend

### `GET /publico/ies`

```python
@router.get("/ies", response_model=list[IesOut])
def listar_ies_publico(db: Session = Depends(get_db)):
    ies_list = db.query(IES).filter_by(activa=True).order_by(IES.nombre).all()
    return [IesOut(id=i.id, nombre=i.nombre, nombre_corto=i.nombre_corto) for i in ies_list]
```

Reutiliza el schema `IesOut` existente: `{id, nombre, nombre_corto?}`.

## Diseño Frontend

### `getPublicoIes()` en api.ts

```typescript
export async function getPublicoIes(): Promise<{ id: string; nombre: string; nombre_corto?: string }[]> {
  const res = await fetch(`${BASE}/publico/ies`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}
```

### `comparar/page.tsx`

Client component. Carga la lista de IES al montar, gestiona `iesAId` e `iesBId` como estado, y pasa ambos IDs a `ComparacionIES`.

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
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Comparar Instituciones</h1>

      <div className="flex gap-4 mb-8">
        {['A', 'B'].map((letra, i) => {
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
                {ies.map(i => (
                  <option key={i.id} value={i.id}>{i.nombre_corto ?? i.nombre}</option>
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

### `ComparacionIES.tsx`

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
  iesAId: string; iesBId: string; iesANombre: string; iesBNombre: string
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
      {/* Header */}
      <div className="grid grid-cols-3 bg-gray-800 text-white text-sm font-semibold">
        <div className="px-4 py-3">Métrica</div>
        <div className="px-4 py-3 text-center border-l border-gray-700 truncate" title={iesANombre}>
          {iesANombre}
        </div>
        <div className="px-4 py-3 text-center border-l border-gray-700 truncate" title={iesBNombre}>
          {iesBNombre}
        </div>
      </div>

      {/* Filas */}
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

### Sidebar: agregar link "Comparar"

Agregar antes de `{ href: '/rector', label: 'Rector', icon: '🏛' }`:

```tsx
{ href: '/comparar', label: 'Comparar', icon: '⚖️' },
```

## Tests Backend

En `tests/api/test_publico.py`, agregar:

```python
def test_listar_ies_publico_sin_auth(client, db_with_seed):
    resp = client.get("/publico/ies")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    # con seed hay al menos 1 IES activa
    assert len(data) >= 1
    assert "id" in data[0]
    assert "nombre" in data[0]

def test_listar_ies_publico_no_requiere_admin_key(client, db_with_seed):
    resp = client.get("/publico/ies", headers={"X-Admin-Key": "wrong"})
    assert resp.status_code == 200  # no require auth, key irrelevante
```

## Criterios de éxito

1. `GET /publico/ies` responde 200 sin auth
2. 172 tests Python pasando (170 + 2 nuevos)
3. `tsc --noEmit` → 0 errores
4. Página `/comparar` muestra dos selectores
5. Al seleccionar dos IES distintas: tabla con 4 métricas, ganador marcado con ✓ y fondo verde
6. Mismo IES en ambos → no muestra comparación (muestra hint)

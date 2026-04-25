# Sprint 23 — Exportar CSV desde TendenciasPanel

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar botón "Exportar CSV" al TendenciasPanel que descarga el histórico de D1-D4 KPIs de la carrera seleccionada.

**Architecture:** Cambio puramente frontend en un solo archivo. Al click, se hacen 4 fetch paralelos con `Promise.all` a `getKpisHistorico`, se pivotan las series por fecha en una tabla plana, se genera un Blob CSV y se dispara la descarga con `<a download>` programático. Sin cambios al backend.

**Tech Stack:** Next.js 14 (App Router), TypeScript, React hooks, Browser Blob/URL API

---

## Mapa de archivos

| Archivo | Acción | Responsabilidad |
|---------|--------|-----------------|
| `frontend/src/components/TendenciasPanel.tsx` | Modificar | Agregar `exportarCSV`, `handleExport`, estado `exportando`, botón UI |

---

## Task 1: Agregar exportación CSV a TendenciasPanel

**Files:**
- Modify: `frontend/src/components/TendenciasPanel.tsx`

**Contexto del archivo actual:**

```
TendenciasPanel.tsx (133 líneas)
├── imports: useState, useEffect, CarreraKpi, HistoricoSerie, HistoricoPoint, getKpisHistorico
├── KPIS: array de 4 configs (d1_score, d2_score, d3_score, d6_score)
├── MiniChart: componente SVG local
├── KpiCard: componente con estado propio que llama getKpisHistorico
└── TendenciasPanel (default export):
    ├── estado: selectedId
    ├── selector de carrera
    └── grid 2x2 de KpiCard
```

- [ ] **Paso 1: Agregar función `exportarCSV` y estado `exportando`**

Abre `frontend/src/components/TendenciasPanel.tsx`. Agrega la función `exportarCSV` y el estado `exportando` dentro del componente `TendenciasPanel`, justo antes del `return`. El componente actualmente empieza en línea 97:

```tsx
export default function TendenciasPanel({ carreras }: { carreras: CarreraKpi[] }) {
  const [selectedId, setSelectedId] = useState<string>(carreras[0]?.id ?? '')
  const [exportando, setExportando] = useState(false)

  if (carreras.length === 0) {
    return <p className="text-sm text-gray-400">Sin carreras registradas.</p>
  }

  async function exportarCSV(carreraId: string, carreraNombre: string) {
    const [d1, d2, d3, d6] = await Promise.all([
      getKpisHistorico(carreraId, 'd1_score'),
      getKpisHistorico(carreraId, 'd2_score'),
      getKpisHistorico(carreraId, 'd3_score'),
      getKpisHistorico(carreraId, 'd6_score'),
    ])

    const fechas = [...new Set([
      ...d1.serie.map(p => p.fecha),
      ...d2.serie.map(p => p.fecha),
      ...d3.serie.map(p => p.fecha),
      ...d6.serie.map(p => p.fecha),
    ])].sort()

    const lookup = {
      d1: Object.fromEntries(d1.serie.map(p => [p.fecha, p.valor])),
      d2: Object.fromEntries(d2.serie.map(p => [p.fecha, p.valor])),
      d3: Object.fromEntries(d3.serie.map(p => [p.fecha, p.valor])),
      d6: Object.fromEntries(d6.serie.map(p => [p.fecha, p.valor])),
    }

    const header = 'fecha,d1_score,d2_score,d3_score,d6_score'
    const rows = fechas.map(f =>
      `${f},${lookup.d1[f] ?? ''},${lookup.d2[f] ?? ''},${lookup.d3[f] ?? ''},${lookup.d6[f] ?? ''}`
    )
    const csv = [header, ...rows].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const fecha = new Date().toISOString().slice(0, 10)
    const nombre = carreraNombre.replace(/\s+/g, '_').toLowerCase()
    a.href = url
    a.download = `tendencias_${nombre}_${fecha}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleExport() {
    if (!selectedId || exportando) return
    setExportando(true)
    try {
      const carrera = carreras.find(c => c.id === selectedId)
      await exportarCSV(selectedId, carrera?.nombre ?? selectedId)
    } finally {
      setExportando(false)
    }
  }

  return (
    // ... resto sin cambios por ahora
  )
}
```

- [ ] **Paso 2: Agregar el botón al JSX del return**

En el `return` del componente, el `div` del selector de carrera actualmente es:

```tsx
<div className="flex items-center gap-3">
  <label className="text-sm font-medium text-gray-600 shrink-0">Carrera:</label>
  <select
    value={selectedId}
    onChange={e => setSelectedId(e.target.value)}
    className="border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
  >
    {carreras.map(c => (
      <option key={c.id} value={c.id}>{c.nombre}</option>
    ))}
  </select>
</div>
```

Reemplazar con:

```tsx
<div className="flex items-center gap-3">
  <label className="text-sm font-medium text-gray-600 shrink-0">Carrera:</label>
  <select
    value={selectedId}
    onChange={e => setSelectedId(e.target.value)}
    className="border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
  >
    {carreras.map(c => (
      <option key={c.id} value={c.id}>{c.nombre}</option>
    ))}
  </select>
  <button
    onClick={handleExport}
    disabled={!selectedId || exportando}
    className="ml-auto text-xs px-3 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
  >
    {exportando ? 'Exportando...' : 'Exportar CSV'}
  </button>
</div>
```

- [ ] **Paso 3: Verificar TypeScript — 0 errores**

```bash
cd ~/Documents/OIA-EE/frontend
./node_modules/.bin/tsc -p tsconfig.json --noEmit
```

Salida esperada: sin output (0 errores). Si hay errores, corregirlos antes de continuar.

- [ ] **Paso 4: Verificar que los tests Python no se rompieron**

```bash
cd ~/Documents/OIA-EE
source pipeline/.venv/bin/activate
python -m pytest tests/ -q 2>&1 | tail -3
```

Salida esperada: `170 passed`

- [ ] **Paso 5: Commit**

```bash
cd ~/Documents/OIA-EE
git add frontend/src/components/TendenciasPanel.tsx
git commit -m "feat: exportar CSV desde TendenciasPanel (Sprint 23)"
```

---

## Criterios de éxito finales

- [ ] `tsc --noEmit` → 0 errores
- [ ] `python -m pytest tests/ -q` → 170 passed (sin regresiones)
- [ ] Botón "Exportar CSV" visible junto al selector de carrera
- [ ] Al click: spinner "Exportando..." → descarga `tendencias_<carrera>_<fecha>.csv`
- [ ] CSV tiene header `fecha,d1_score,d2_score,d3_score,d6_score` + filas ordenadas cronológicamente
- [ ] Botón deshabilitado si `selectedId` está vacío o si ya está exportando

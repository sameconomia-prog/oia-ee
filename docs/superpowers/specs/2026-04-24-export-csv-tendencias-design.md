# Sprint 23 — Exportar CSV desde TendenciasPanel

**Fecha:** 2026-04-24  
**Estado:** Aprobado

## Problema

El TendenciasPanel muestra gráficas históricas de D1-D6 por carrera, pero no hay forma de exportar esos datos. Los rectores necesitan descargar el histórico para análisis en Excel o reportes.

## Alcance

- Botón "Exportar CSV" en `TendenciasPanel.tsx`
- Al click: 4 fetch paralelos de los 4 KPIs (D1, D2, D3, D6) para la carrera seleccionada
- Pivot de las series por fecha → tabla plana
- Descarga automática del archivo CSV via `<a download>`
- Estado de carga (spinner) en el botón durante el fetch
- Botón deshabilitado si no hay carrera seleccionada

## Fuera de alcance

- Cambios al backend
- Nuevos archivos
- Exportar D4, D5, D7 (no están en TendenciasPanel)
- Exportar todas las carreras a la vez

## Archivo a modificar

| Archivo | Acción |
|---------|--------|
| `frontend/src/components/TendenciasPanel.tsx` | Agregar función `exportarCSV` y botón |

## Diseño técnico

### Función `exportarCSV`

```typescript
async function exportarCSV(carreraId: string, carreraNombre: string) {
  // 1. Fetch paralelo de las 4 series
  const [d1, d2, d3, d6] = await Promise.all([
    getKpisHistorico(carreraId, 'd1_score'),
    getKpisHistorico(carreraId, 'd2_score'),
    getKpisHistorico(carreraId, 'd3_score'),
    getKpisHistorico(carreraId, 'd6_score'),
  ])

  // 2. Recopilar todas las fechas únicas
  const fechas = [...new Set([
    ...d1.serie.map(p => p.fecha),
    ...d2.serie.map(p => p.fecha),
    ...d3.serie.map(p => p.fecha),
    ...d6.serie.map(p => p.fecha),
  ])].sort()

  // 3. Crear lookup por KPI
  const lookup = {
    d1: Object.fromEntries(d1.serie.map(p => [p.fecha, p.valor])),
    d2: Object.fromEntries(d2.serie.map(p => [p.fecha, p.valor])),
    d3: Object.fromEntries(d3.serie.map(p => [p.fecha, p.valor])),
    d6: Object.fromEntries(d6.serie.map(p => [p.fecha, p.valor])),
  }

  // 4. Construir CSV
  const header = 'fecha,d1_score,d2_score,d3_score,d6_score'
  const rows = fechas.map(f =>
    `${f},${lookup.d1[f] ?? ''},${lookup.d2[f] ?? ''},${lookup.d3[f] ?? ''},${lookup.d6[f] ?? ''}`
  )
  const csv = [header, ...rows].join('\n')

  // 5. Trigger descarga
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
```

### Estado del botón

```typescript
const [exportando, setExportando] = useState(false)

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
```

### UI del botón

```tsx
<button
  onClick={handleExport}
  disabled={!selectedId || exportando}
  className="text-xs px-3 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
>
  {exportando ? 'Exportando...' : 'Exportar CSV'}
</button>
```

Colocado junto al selector de carrera en el header del panel.

## Formato CSV

```
fecha,d1_score,d2_score,d3_score,d6_score
2026-01-15,0.72,0.45,0.61,0.38
2026-01-22,0.70,0.47,0.63,0.40
```

- Valores como decimales (0.0–1.0), no porcentaje
- Celdas vacías si una fecha no tiene valor en algún KPI
- Ordenado cronológicamente

## Filename

`tendencias_{nombre_carrera_snake_case}_{YYYY-MM-DD}.csv`

Ejemplo: `tendencias_ingeniería_en_sistemas_2026-04-24.csv`

## Criterios de éxito

1. Click en "Exportar CSV" descarga el archivo sin errores
2. CSV contiene header + filas con fechas ordenadas
3. Botón muestra "Exportando..." durante el fetch y se deshabilita
4. Sin cambios al backend ni nuevos archivos
5. `tsc --noEmit` → 0 errores TypeScript

'use client'
import { useState, useEffect } from 'react'
import type { CarreraKpi, HistoricoSerie, HistoricoPoint } from '@/lib/types'
import { getKpisHistorico } from '@/lib/api'

const KPIS = [
  { key: 'd1_score' as const, label: 'D1 Obsolescencia', color: '#ef4444', invertido: true },
  { key: 'd2_score' as const, label: 'D2 Oportunidades', color: '#22c55e', invertido: false },
  { key: 'd3_score' as const, label: 'D3 Mercado', color: '#3b82f6', invertido: false },
  { key: 'd6_score' as const, label: 'D6 Estudiantil', color: '#a855f7', invertido: false },
]

function MiniChart({ serie, color, width = 200, height = 60 }: {
  serie: HistoricoPoint[]
  color: string
  width?: number
  height?: number
}) {
  if (serie.length < 2) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-gray-400">
        Sin datos suficientes
      </div>
    )
  }

  const valores = serie.map(p => p.valor)
  const min = Math.min(...valores)
  const max = Math.max(...valores)
  const range = max - min || 0.001
  const pad = 4

  const toX = (i: number) => pad + (i / (serie.length - 1)) * (width - 2 * pad)
  const toY = (v: number) => height - pad - ((v - min) / range) * (height - 2 * pad)

  const points = serie.map((p, i) => `${toX(i)},${toY(p.valor)}`).join(' ')
  const last = serie[serie.length - 1]
  const prev = serie[serie.length - 2]
  const trend = last.valor > prev.valor ? '↑' : last.valor < prev.valor ? '↓' : '→'
  const trendColor = last.valor > prev.valor ? 'text-red-500' : last.valor < prev.valor ? 'text-green-600' : 'text-gray-400'

  return (
    <div className="flex items-center gap-3">
      <svg width={width} height={height} className="overflow-visible">
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {serie.map((p, i) => (
          <circle key={i} cx={toX(i)} cy={toY(p.valor)} r="2.5" fill={color} />
        ))}
      </svg>
      <div className="text-right shrink-0">
        <p className="text-lg font-bold" style={{ color }}>
          {(last.valor * 100).toFixed(0)}
          <span className="text-xs font-normal text-gray-500">%</span>
        </p>
        <p className={`text-sm font-semibold ${trendColor}`}>{trend}</p>
      </div>
    </div>
  )
}

function KpiCard({ kpi, carreraId }: {
  kpi: typeof KPIS[number]
  carreraId: string
}) {
  const [data, setData] = useState<HistoricoSerie | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getKpisHistorico(carreraId, kpi.key)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [carreraId, kpi.key])

  return (
    <div className="border rounded p-3 bg-white">
      <p className="text-xs font-semibold text-gray-500 mb-2">{kpi.label}</p>
      {loading ? (
        <p className="text-xs text-gray-300 py-3">Cargando...</p>
      ) : !data || data.serie.length === 0 ? (
        <p className="text-xs text-gray-400 py-3">Sin historial registrado aún.</p>
      ) : (
        <MiniChart serie={data.serie} color={kpi.color} />
      )}
    </div>
  )
}

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

    const allFechas = [
      ...d1.serie.map(p => p.fecha),
      ...d2.serie.map(p => p.fecha),
      ...d3.serie.map(p => p.fecha),
      ...d6.serie.map(p => p.fecha),
    ]
    const fechas = Array.from(new Set(allFechas)).sort()

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
    <div className="space-y-4">
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

      {selectedId && (
        <div className="grid grid-cols-2 gap-3">
          {KPIS.map(kpi => (
            <KpiCard key={kpi.key} kpi={kpi} carreraId={selectedId} />
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400">
        Snapshot semanal · Los datos aparecen después de ejecutar al menos un ciclo.
      </p>
    </div>
  )
}

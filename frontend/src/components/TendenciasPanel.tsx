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

  if (carreras.length === 0) {
    return <p className="text-sm text-gray-400">Sin carreras registradas.</p>
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

'use client'
import { useEffect, useState } from 'react'
import { getTendenciasNacionales } from '@/lib/api'
import type { TendenciaNacional } from '@/lib/types'

const SERIES = [
  { key: 'd1_score' as const, label: 'D1 Obsolescencia', color: '#ef4444' },
  { key: 'd2_score' as const, label: 'D2 Oportunidades', color: '#22c55e' },
  { key: 'd3_score' as const, label: 'D3 Mercado', color: '#3b82f6' },
  { key: 'd6_score' as const, label: 'D6 Estudiantil', color: '#a855f7' },
]

const W = 560
const H = 120
const PAD = { top: 8, right: 12, bottom: 20, left: 32 }

function toX(i: number, n: number) {
  return PAD.left + (i / Math.max(n - 1, 1)) * (W - PAD.left - PAD.right)
}
function toY(v: number) {
  return PAD.top + (1 - v) * (H - PAD.top - PAD.bottom)
}

export default function TendenciasNacionalesChart({ dias = 30 }: { dias?: number }) {
  const [data, setData] = useState<TendenciaNacional[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getTendenciasNacionales(dias)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [dias])

  if (loading) return <p className="text-xs text-gray-400 py-4 text-center">Cargando tendencias...</p>
  if (data.length < 2) return null

  const n = data.length
  const yTicks = [0, 0.25, 0.5, 0.75, 1.0]

  return (
    <div className="mb-8 bg-white rounded-xl border shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-800 text-sm">
          Tendencias nacionales · últimos {dias} días
        </h2>
        <div className="flex gap-3 flex-wrap">
          {SERIES.map(s => (
            <span key={s.key} className="flex items-center gap-1 text-xs text-gray-500">
              <span className="inline-block w-3 h-0.5 rounded" style={{ backgroundColor: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
        {/* Y grid lines */}
        {yTicks.map(v => (
          <g key={v}>
            <line
              x1={PAD.left} y1={toY(v)} x2={W - PAD.right} y2={toY(v)}
              stroke="#f0f0f0" strokeWidth="1"
            />
            <text x={PAD.left - 4} y={toY(v) + 3} textAnchor="end" fontSize="8" fill="#9ca3af">
              {v.toFixed(2)}
            </text>
          </g>
        ))}
        {/* X axis labels (first and last date) */}
        <text x={PAD.left} y={H - 2} textAnchor="start" fontSize="8" fill="#9ca3af">
          {data[0].fecha}
        </text>
        <text x={W - PAD.right} y={H - 2} textAnchor="end" fontSize="8" fill="#9ca3af">
          {data[n - 1].fecha}
        </text>
        {/* Lines */}
        {SERIES.map(s => {
          const pts = data
            .map((d, i) => d[s.key] != null ? `${toX(i, n)},${toY(d[s.key]!)}` : null)
            .filter(Boolean)
          if (pts.length < 2) return null
          return (
            <polyline
              key={s.key}
              points={pts.join(' ')}
              fill="none"
              stroke={s.color}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          )
        })}
      </svg>
    </div>
  )
}

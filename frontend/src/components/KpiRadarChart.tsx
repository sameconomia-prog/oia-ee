'use client'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
} from 'recharts'
import type { KpiResult } from '@/lib/types'

interface Props {
  kpi: KpiResult
  nombre?: string
}

// D1 inverted: high score = high risk → we show (1 - D1) so that "outward" always means "better"
const toChartData = (kpi: KpiResult) => [
  { dim: 'D1 Riesgo', val: +(1 - kpi.d1_obsolescencia.score).toFixed(3), raw: kpi.d1_obsolescencia.score, invert: true },
  { dim: 'D2 Oportunidad', val: +kpi.d2_oportunidades.score.toFixed(3), raw: kpi.d2_oportunidades.score, invert: false },
  { dim: 'D3 Mercado', val: +kpi.d3_mercado.score.toFixed(3), raw: kpi.d3_mercado.score, invert: false },
  { dim: 'D6 Estudiantil', val: +kpi.d6_estudiantil.score.toFixed(3), raw: kpi.d6_estudiantil.score, invert: false },
]

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: { dim: string; val: number; raw: number; invert: boolean } }[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm text-xs">
      <p className="font-semibold text-slate-700 mb-0.5">{d.dim}</p>
      <p className="font-mono text-slate-600">Score: <span className="font-bold">{d.raw.toFixed(3)}</span></p>
      {d.invert && <p className="text-slate-400">(gráfica invertida: mayor=menor riesgo)</p>}
    </div>
  )
}

export default function KpiRadarChart({ kpi, nombre }: Props) {
  const data = toChartData(kpi)
  const overall = +((1 - kpi.d1_obsolescencia.score + kpi.d2_oportunidades.score + kpi.d3_mercado.score + kpi.d6_estudiantil.score) / 4).toFixed(3)
  const overallColor = overall >= 0.6 ? 'text-emerald-600' : overall >= 0.4 ? 'text-amber-600' : 'text-red-600'

  return (
    <div>
      {nombre && <p className="text-xs text-slate-500 mb-2 truncate">{nombre}</p>}
      <div className="flex items-center gap-1.5 mb-3">
        <span className="text-xs text-slate-500">Índice global:</span>
        <span className={`text-sm font-bold font-mono ${overallColor}`}>{overall.toFixed(3)}</span>
        <span className="text-[10px] text-slate-400">(D1 invertido)</span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <RadarChart data={data} margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis
            dataKey="dim"
            tick={{ fontSize: 10, fill: '#64748b' }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 1]}
            tick={{ fontSize: 9, fill: '#94a3b8' }}
            tickCount={4}
          />
          <Radar
            name="Score"
            dataKey="val"
            stroke="#6366f1"
            fill="#6366f1"
            fillOpacity={0.25}
            strokeWidth={2}
          />
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
      <p className="text-[10px] text-slate-400 text-center mt-1">D1 invertido: mayor área = mejor perfil general</p>
    </div>
  )
}

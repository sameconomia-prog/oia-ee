'use client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import type { CarreraKpi } from '@/lib/types'

interface Props {
  iesANombre: string
  iesBNombre: string
  carrerasComunes: { cA: CarreraKpi; cB: CarreraKpi }[]
}

function avg(nums: number[]) {
  return nums.length ? +(nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(3) : 0
}

const TOOLTIP_STYLE = {
  contentStyle: { fontSize: 11, borderRadius: 6, border: '1px solid #e2e8f0' },
  labelStyle: { fontWeight: 600, fontSize: 11 },
}

export default function ComparacionResumenChart({ iesANombre, iesBNombre, carrerasComunes }: Props) {
  if (carrerasComunes.length === 0) return null

  const short = (s: string) => s.length > 20 ? s.slice(0, 18) + '…' : s
  const labelA = short(iesANombre)
  const labelB = short(iesBNombre)

  const d1A = carrerasComunes.map(c => c.cA.kpi?.d1_obsolescencia.score ?? 0)
  const d1B = carrerasComunes.map(c => c.cB.kpi?.d1_obsolescencia.score ?? 0)
  const d2A = carrerasComunes.map(c => c.cA.kpi?.d2_oportunidades.score ?? 0)
  const d2B = carrerasComunes.map(c => c.cB.kpi?.d2_oportunidades.score ?? 0)
  const d3A = carrerasComunes.map(c => c.cA.kpi?.d3_mercado.score ?? 0)
  const d3B = carrerasComunes.map(c => c.cB.kpi?.d3_mercado.score ?? 0)
  const d6A = carrerasComunes.map(c => c.cA.kpi?.d6_estudiantil.score ?? 0)
  const d6B = carrerasComunes.map(c => c.cB.kpi?.d6_estudiantil.score ?? 0)

  const data = [
    { dim: 'D1 Riesgo', [labelA]: avg(d1A), [labelB]: avg(d1B), nota: 'menor=mejor' },
    { dim: 'D2 Oportunidad', [labelA]: avg(d2A), [labelB]: avg(d2B), nota: 'mayor=mejor' },
    { dim: 'D3 Mercado', [labelA]: avg(d3A), [labelB]: avg(d3B), nota: 'mayor=mejor' },
    { dim: 'D6 Estudiantil', [labelA]: avg(d6A), [labelB]: avg(d6B), nota: 'mayor=mejor' },
  ]

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Promedios KPI — carreras en común</h2>
          <p className="text-xs text-slate-400 mt-0.5">{carrerasComunes.length} carreras · barras = promedio · D1: menor es mejor</p>
        </div>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 4, right: 16, bottom: 4, left: 0 }} barCategoryGap="28%">
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="dim" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 1]} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => v.toFixed(1)} axisLine={false} tickLine={false} width={28} />
            <ReferenceLine y={0.5} stroke="#e2e8f0" strokeDasharray="4 2" />
            <Tooltip {...TOOLTIP_STYLE} formatter={(value) => [typeof value === 'number' ? value.toFixed(3) : value]} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey={labelA} fill="#6366f1" radius={[3, 3, 0, 0]} />
            <Bar dataKey={labelB} fill="#14b8a6" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

'use client'
import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { getTendenciasNacionales, getTopRiesgo, getTopOportunidades } from '@/lib/api'
import type { TendenciaNacional, TopRiesgoItem } from '@/lib/types'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts'

const DIAS_OPTIONS = [
  { label: '30 días', value: 30 },
  { label: '90 días', value: 90 },
  { label: '180 días', value: 180 },
  { label: '365 días', value: 365 },
]

const SERIES = [
  { key: 'd1_score' as keyof TendenciaNacional, label: 'D1 Obsolescencia', color: '#ef4444', invert: true },
  { key: 'd2_score' as keyof TendenciaNacional, label: 'D2 Oportunidades', color: '#22c55e', invert: false },
  { key: 'd3_score' as keyof TendenciaNacional, label: 'D3 Mercado', color: '#3b82f6', invert: false },
  { key: 'd6_score' as keyof TendenciaNacional, label: 'D6 Estudiantil', color: '#a855f7', invert: false },
]

function trendArrow(vals: number[], invert: boolean) {
  if (vals.length < 2) return { arrow: '→', color: '#94a3b8', delta: 0 }
  const delta = vals[vals.length - 1] - vals[0]
  const good = invert ? delta < 0 : delta > 0
  const bad = invert ? delta > 0 : delta < 0
  return {
    arrow: delta > 0.001 ? '↑' : delta < -0.001 ? '↓' : '→',
    color: good ? '#10b981' : bad ? '#ef4444' : '#94a3b8',
    delta,
  }
}

function StatCard({ label, value, trend, color }: {
  label: string; value: number; trend: ReturnType<typeof trendArrow>; color: string
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
        <span className="text-xs font-medium text-slate-600">{label}</span>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold font-mono text-slate-800">{value.toFixed(3)}</span>
        <span className="text-sm font-bold mb-0.5" style={{ color: trend.color }}>
          {trend.arrow} {Math.abs(trend.delta).toFixed(3)}
        </span>
      </div>
    </div>
  )
}

export default function TendenciasPage() {
  const [dias, setDias] = useState(90)
  const [tendencias, setTendencias] = useState<TendenciaNacional[]>([])
  const [topRiesgo, setTopRiesgo] = useState<TopRiesgoItem[]>([])
  const [topOport, setTopOport] = useState<TopRiesgoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [visibles, setVisibles] = useState<Set<string>>(new Set(SERIES.map(s => s.key)))

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getTendenciasNacionales(dias),
      getTopRiesgo(8),
      getTopOportunidades(8),
    ]).then(([t, r, o]) => {
      setTendencias(t)
      setTopRiesgo(r)
      setTopOport(o)
    }).finally(() => setLoading(false))
  }, [dias])

  const stats = useMemo(() => {
    if (tendencias.length < 2) return null
    return SERIES.map(s => {
      const vals = tendencias.map(d => d[s.key] as number | null).filter((v): v is number => v != null)
      return { ...s, current: vals[vals.length - 1] ?? 0, trend: trendArrow(vals, s.invert) }
    })
  }, [tendencias])

  const chartData = tendencias.map(d => ({
    fecha: d.fecha.slice(0, 10),
    d1_score: d.d1_score,
    d2_score: d.d2_score,
    d3_score: d.d3_score,
    d6_score: d.d6_score,
  }))

  function toggleSerie(key: string) {
    setVisibles(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Tendencias Nacionales</h1>
        <p className="text-sm text-slate-500 mt-1">
          Evolución histórica de indicadores KPI promediados sobre todas las carreras activas del país.
        </p>
      </div>

      {/* Selector de periodo */}
      <div className="flex gap-1 mb-5">
        {DIAS_OPTIONS.map(o => (
          <button
            key={o.value}
            onClick={() => setDias(o.value)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              dias === o.value
                ? 'bg-indigo-600 text-white font-medium'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm py-12 text-center">Cargando tendencias...</p>
      ) : (
        <>
          {/* Stat cards */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {stats.map(s => (
                <StatCard key={s.key} label={s.label} value={s.current} trend={s.trend} color={s.color} />
              ))}
            </div>
          )}

          {/* Chart */}
          {tendencias.length >= 2 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-4 mb-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-800">
                  Evolución KPI — últimos {dias} días
                </h2>
                {/* Toggle series */}
                <div className="flex gap-2 flex-wrap justify-end">
                  {SERIES.map(s => (
                    <button
                      key={s.key}
                      onClick={() => toggleSerie(s.key)}
                      className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded transition-opacity ${
                        visibles.has(s.key) ? 'opacity-100' : 'opacity-30'
                      }`}
                    >
                      <span className="w-3 h-0.5 rounded inline-block" style={{ background: s.color }} />
                      <span className="text-slate-600">{s.label.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="fecha"
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    tickFormatter={v => v.slice(5)}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={[0, 1]}
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    tickFormatter={v => v.toFixed(1)}
                    width={28}
                  />
                  <ReferenceLine y={0.5} stroke="#e2e8f0" strokeDasharray="4 2" />
                  <Tooltip
                    formatter={(v) => [typeof v === 'number' ? v.toFixed(3) : v]}
                    labelStyle={{ fontSize: 11, color: '#475569' }}
                    contentStyle={{ fontSize: 11 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {SERIES.map(s => visibles.has(s.key) && (
                    <Line
                      key={s.key}
                      type="monotone"
                      dataKey={s.key}
                      name={s.label}
                      stroke={s.color}
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-10 text-center mb-5">
              <p className="text-slate-400 text-sm">Sin datos históricos para el periodo seleccionado.</p>
              <p className="text-slate-300 text-xs mt-1">Los snapshots se generan semanalmente vía el admin.</p>
            </div>
          )}

          {/* Top Riesgo + Top Oportunidad */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-red-50 border-b border-red-100">
                <h2 className="text-sm font-semibold text-red-800">Top 8 Carreras — Mayor Riesgo IA</h2>
                <p className="text-xs text-red-500 mt-0.5">D1 más alto · mayor obsolescencia</p>
              </div>
              <div className="divide-y divide-slate-100">
                {topRiesgo.map((c, i) => (
                  <div key={c.carrera_id} className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-slate-300 w-4 shrink-0">{i + 1}</span>
                      <Link href={`/carreras/${c.carrera_id}`} className="text-sm text-slate-700 hover:text-red-700 hover:underline truncate">
                        {c.nombre}
                      </Link>
                    </div>
                    <span className="text-xs font-mono font-semibold text-red-600 shrink-0 ml-2">
                      {c.d1_score.toFixed(2)}
                    </span>
                  </div>
                ))}
                {topRiesgo.length === 0 && (
                  <p className="text-xs text-slate-400 px-4 py-4">Sin datos disponibles.</p>
                )}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-emerald-50 border-b border-emerald-100">
                <h2 className="text-sm font-semibold text-emerald-800">Top 8 Carreras — Mayor Oportunidad</h2>
                <p className="text-xs text-emerald-500 mt-0.5">D2 más alto · mayor demanda laboral</p>
              </div>
              <div className="divide-y divide-slate-100">
                {topOport.map((c, i) => (
                  <div key={c.carrera_id} className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-slate-300 w-4 shrink-0">{i + 1}</span>
                      <Link href={`/carreras/${c.carrera_id}`} className="text-sm text-slate-700 hover:text-emerald-700 hover:underline truncate">
                        {c.nombre}
                      </Link>
                    </div>
                    <span className="text-xs font-mono font-semibold text-emerald-600 shrink-0 ml-2">
                      {c.d2_score.toFixed(2)}
                    </span>
                  </div>
                ))}
                {topOport.length === 0 && (
                  <p className="text-xs text-slate-400 px-4 py-4">Sin datos disponibles.</p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 text-xs text-slate-400 flex items-center justify-between">
            <span>Promedio nacional · snapshots semanales</span>
            <Link href="/kpis" className="text-indigo-600 hover:underline">Ver KPIs completos →</Link>
          </div>
        </>
      )}
    </div>
  )
}

'use client'
import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { getIesPublico } from '@/lib/api'
import type { IesInfo } from '@/lib/types'
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts'

type SortKey = 'composite' | 'd1' | 'd2' | 'nombre' | 'carreras'

function composite(d1: number, d2: number) {
  return +((1 - d1) * 0.5 + d2 * 0.5).toFixed(4)
}

function cuadrante(d1: number, d2: number) {
  if (d1 < 0.5 && d2 >= 0.5) return { label: 'Estrella', color: '#10b981' }
  if (d1 >= 0.5 && d2 >= 0.5) return { label: 'En Transformación', color: '#f59e0b' }
  if (d1 < 0.5 && d2 < 0.5)  return { label: 'Estable', color: '#6366f1' }
  return { label: 'En Riesgo', color: '#ef4444' }
}

interface TooltipPayload { id: string; nombre: string; d1: number; d2: number; score: number }

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: TooltipPayload }[] }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  const q = cuadrante(p.d1, p.d2)
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm text-xs max-w-[200px]">
      <p className="font-semibold text-slate-800 mb-1 leading-tight">{p.nombre}</p>
      <p className="font-mono text-slate-600">D1: <span className="font-bold text-red-600">{p.d1.toFixed(3)}</span></p>
      <p className="font-mono text-slate-600">D2: <span className="font-bold text-emerald-600">{p.d2.toFixed(3)}</span></p>
      <p className="mt-1 text-[10px] font-semibold" style={{ color: q.color }}>{q.label}</p>
    </div>
  )
}

export default function RankingIesPage() {
  const [ies, setIes] = useState<IesInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<SortKey>('composite')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [q, setQ] = useState('')

  useEffect(() => {
    getIesPublico()
      .then(data => setIes(data.filter(i => i.promedio_d1 != null && i.promedio_d2 != null)))
      .finally(() => setLoading(false))
  }, [])

  const sorted = useMemo(() => {
    let list = ies.filter(i =>
      !q.trim() || i.nombre.toLowerCase().includes(q.toLowerCase()) ||
      (i.nombre_corto ?? '').toLowerCase().includes(q.toLowerCase())
    )
    list = [...list].sort((a, b) => {
      let va = 0, vb = 0
      if (sort === 'composite') { va = composite(a.promedio_d1!, a.promedio_d2!); vb = composite(b.promedio_d1!, b.promedio_d2!) }
      else if (sort === 'd1') { va = a.promedio_d1!; vb = b.promedio_d1! }
      else if (sort === 'd2') { va = a.promedio_d2!; vb = b.promedio_d2! }
      else if (sort === 'carreras') { va = a.total_carreras ?? 0; vb = b.total_carreras ?? 0 }
      else { return sortDir === 'asc' ? a.nombre.localeCompare(b.nombre) : b.nombre.localeCompare(a.nombre) }
      return sortDir === 'asc' ? va - vb : vb - va
    })
    return list
  }, [ies, sort, sortDir, q])

  const scatterData = useMemo(() =>
    ies.map(i => ({
      id: i.id,
      nombre: i.nombre_corto ?? i.nombre,
      d1: i.promedio_d1!,
      d2: i.promedio_d2!,
      score: composite(i.promedio_d1!, i.promedio_d2!),
    })),
    [ies]
  )

  function toggleSort(key: SortKey) {
    if (sort === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSort(key); setSortDir('desc') }
  }

  function exportCSV() {
    const header = 'Rank,IES,Nombre Corto,D1 Riesgo,D2 Oportunidad,Score Composite,Carreras'
    const rows = sorted.map((i, idx) =>
      `${idx + 1},"${i.nombre}","${i.nombre_corto ?? ''}",${i.promedio_d1?.toFixed(4)},${i.promedio_d2?.toFixed(4)},${composite(i.promedio_d1!, i.promedio_d2!).toFixed(4)},${i.total_carreras ?? ''}`
    )
    const csv = '\uFEFF' + [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ranking_ies_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <p className="text-slate-400 text-sm py-12 text-center">Cargando ranking...</p>

  const TH = ({ k, label }: { k: SortKey; label: string }) => (
    <th
      onClick={() => toggleSort(k)}
      className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide cursor-pointer hover:text-slate-700 select-none"
    >
      {label} {sort === k ? (sortDir === 'desc' ? '↓' : '↑') : ''}
    </th>
  )

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Ranking Nacional de IES</h1>
        <p className="text-sm text-slate-500 mt-1">
          Clasificación de instituciones por score composite (1-D1 + D2) / 2 — bajo riesgo y alta oportunidad.
        </p>
      </div>

      {/* Scatter matrix */}
      {scatterData.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-slate-800">Mapa D1 × D2 — todas las IES</h2>
            <div className="flex gap-3 text-[10px] text-slate-500">
              {[
                { color: '#10b981', label: 'Estrella' },
                { color: '#f59e0b', label: 'Transformación' },
                { color: '#6366f1', label: 'Estable' },
                { color: '#ef4444', label: 'En Riesgo' },
              ].map(q => (
                <span key={q.label} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: q.color }} />
                  {q.label}
                </span>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                type="number" dataKey="d1" domain={[0, 1]} name="D1 Riesgo"
                tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => v.toFixed(1)}
                label={{ value: 'D1 — Riesgo →', position: 'insideBottom', offset: -8, fontSize: 10, fill: '#ef4444' }}
              />
              <YAxis
                type="number" dataKey="d2" domain={[0, 1]} name="D2 Oportunidad"
                tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => v.toFixed(1)}
                label={{ value: 'D2 — Oportunidad →', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10, fill: '#10b981' }}
              />
              <ReferenceLine x={0.5} stroke="#cbd5e1" strokeDasharray="4 2" strokeWidth={1.5} />
              <ReferenceLine y={0.5} stroke="#cbd5e1" strokeDasharray="4 2" strokeWidth={1.5} />
              <Tooltip content={<ChartTooltip />} />
              <Scatter data={scatterData} isAnimationActive={false}>
                {scatterData.map(p => {
                  const q = cuadrante(p.d1, p.d2)
                  return <Cell key={p.id} fill={q.color} fillOpacity={0.8} />
                })}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-slate-400 text-center mt-1">
            Cada punto = 1 institución · pasa el cursor para ver nombre y scores
          </p>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <input
          type="text"
          placeholder="Buscar institución..."
          value={q}
          onChange={e => setQ(e.target.value)}
          className="flex-1 min-w-[200px] border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <span className="text-xs text-slate-500">{sorted.length} IES</span>
        <button
          onClick={exportCSV}
          className="ml-auto text-xs px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors"
        >
          ↓ Exportar CSV
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide w-8">#</th>
              <TH k="nombre" label="Institución" />
              <TH k="d1" label="D1 Riesgo ↑" />
              <TH k="d2" label="D2 Oport. ↑" />
              <TH k="composite" label="Score" />
              <TH k="carreras" label="Carreras" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.map((i, idx) => {
              const d1 = i.promedio_d1!
              const d2 = i.promedio_d2!
              const score = composite(d1, d2)
              const q = cuadrante(d1, d2)
              const d1Color = d1 >= 0.7 ? 'text-red-600' : d1 >= 0.4 ? 'text-amber-600' : 'text-emerald-600'
              const d2Color = d2 >= 0.6 ? 'text-emerald-600' : d2 >= 0.35 ? 'text-amber-600' : 'text-red-600'
              return (
                <tr key={i.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-3 py-2.5 text-slate-300 font-mono text-xs">{idx + 1}</td>
                  <td className="px-3 py-2.5">
                    <Link href={`/ies/${i.id}`} className="font-medium text-slate-800 hover:text-indigo-700 hover:underline">
                      {i.nombre_corto ?? i.nombre}
                    </Link>
                    {i.nombre_corto && <p className="text-[10px] text-slate-400 truncate max-w-xs">{i.nombre}</p>}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`font-mono text-xs font-bold ${d1Color}`}>{d1.toFixed(3)}</span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`font-mono text-xs font-bold ${d2Color}`}>{d2.toFixed(3)}</span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span
                      className="text-xs font-bold font-mono px-1.5 py-0.5 rounded"
                      style={{ color: q.color, background: `${q.color}18` }}
                    >
                      {score.toFixed(3)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center text-xs text-slate-500">
                    {i.total_carreras ?? '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {sorted.length === 0 && (
          <p className="text-slate-400 text-sm text-center py-10">Sin resultados para &ldquo;{q}&rdquo;.</p>
        )}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-100">
          <p className="text-[10px] text-slate-400">
            Score = (1-D1)×50% + D2×50% · Fuente: OIA-EE, promedios ponderados por carrera activa
          </p>
        </div>
      </div>
    </div>
  )
}

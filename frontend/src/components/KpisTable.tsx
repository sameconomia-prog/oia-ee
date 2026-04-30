// frontend/src/components/KpisTable.tsx
'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getCarrerasPublico } from '@/lib/api'
import { dotColor, textColor } from '@/lib/kpi-colors'
import type { CarreraKpi } from '@/lib/types'

const PAGE_SIZE = 25

type SortKey = 'd1' | 'd2' | 'd3' | 'd6'
type SortDir = 'asc' | 'desc'

function Dot({ value, isD1 }: { value: number; isD1: boolean }) {
  return (
    <span
      className={`inline-block w-3 h-3 rounded-full ${dotColor(value, isD1)}`}
    />
  )
}

function Bar({ value, isD1 }: { value: number; isD1: boolean }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="w-11 bg-slate-200 rounded h-1.5">
        <div
          className={`${dotColor(value, isD1)} h-1.5 rounded`}
          style={{ width: `${value * 100}%` }}
        />
      </div>
      <span className={`text-xs ${textColor(value, isD1)}`}>{value.toFixed(2)}</span>
    </div>
  )
}

function Sub({ value, isD1 }: { value: number; isD1: boolean }) {
  return <span className={`text-xs ${textColor(value, isD1)}`}>{value.toFixed(2)}</span>
}

export default function KpisTable() {
  const [rows, setRows] = useState<CarreraKpi[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey>('d1')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getCarrerasPublico({ skip: 0, limit: PAGE_SIZE })
      .then((data) => {
        setRows(data)
        setHasMore(data.length === PAGE_SIZE)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function loadMore() {
    if (loadingMore) return
    setLoadingMore(true)
    try {
      const data = await getCarrerasPublico({ skip: rows.length, limit: PAGE_SIZE })
      setRows(prev => [...prev, ...data])
      setHasMore(data.length === PAGE_SIZE)
    } catch { /* silencioso */ }
    finally { setLoadingMore(false) }
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('desc') }
  }

  const withKpi = rows.filter(r => r.kpi !== null)
  const sorted = [...withKpi].sort((a, b) => {
    const scoreOf = (row: CarreraKpi) => {
      const k = row.kpi!
      if (sortKey === 'd1') return k.d1_obsolescencia.score
      if (sortKey === 'd2') return k.d2_oportunidades.score
      if (sortKey === 'd3') return k.d3_mercado.score
      return k.d6_estudiantil.score
    }
    return sortDir === 'desc' ? scoreOf(b) - scoreOf(a) : scoreOf(a) - scoreOf(b)
  })

  function arrow(key: SortKey) {
    if (sortKey !== key) return ' ↕'
    return sortDir === 'desc' ? ' ↓' : ' ↑'
  }

  function exportCSV() {
    const headers = ['Carrera', 'D1 Score', 'IVA', 'BES', 'VAC', 'D2 Score', 'IOE', 'IHE', 'IEA', 'D3 Score', 'D6 Score']
    const rows = sorted.map(({ nombre, kpi }) => {
      const d1 = kpi!.d1_obsolescencia, d2 = kpi!.d2_oportunidades
      const d3 = kpi!.d3_mercado, d6 = kpi!.d6_estudiantil
      return [nombre, d1.score, d1.iva, d1.bes, d1.vac, d2.score, d2.ioe, d2.ihe, d2.iea, d3.score, d6.score]
        .map(v => typeof v === 'number' ? v.toFixed(4) : `"${v}"`)
    })
    const csv = [headers.map(h => `"${h}"`).join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `kpis-${new Date().toISOString().slice(0,10)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <p className="text-slate-400 py-8">Cargando KPIs...</p>
  if (error) return <p className="text-red-500 py-8">Error: {error}</p>
  if (sorted.length === 0)
    return <p className="text-slate-400 py-8">Sin datos de KPIs disponibles. Ejecuta "Seed Demo" en el panel admin.</p>

  return (
    <div>
      <div className="flex justify-end mb-2">
        <button
          onClick={exportCSV}
          className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors"
        >
          ↓ Exportar CSV ({sorted.length})
        </button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-xs text-center">
              <th className="px-3 py-2 border-b border-slate-200 text-left" rowSpan={2}>
                Carrera
              </th>
              <th colSpan={5} className="px-2 py-1.5 border-b border-l-4 border-l-red-300 bg-red-50 text-red-800 tracking-wide">
                D1 — OBSOLESCENCIA
              </th>
              <th colSpan={5} className="px-2 py-1.5 border-b border-l-4 border-l-emerald-300 bg-emerald-50 text-emerald-800 tracking-wide">
                D2 — OPORTUNIDADES
              </th>
              <th colSpan={2} className="px-2 py-1.5 border-b border-l-4 border-l-brand-600/40 bg-brand-50 text-brand-700 tracking-wide">
                D3 — MERCADO
              </th>
              <th colSpan={2} className="px-2 py-1.5 border-b border-l-4 border-l-purple-300 bg-purple-50 text-purple-800 tracking-wide">
                D6 — ESTUDIANTIL
              </th>
            </tr>
            <tr className="text-xs text-center text-slate-500 bg-slate-50">
              <th className="px-2 py-1 border-b border-slate-200 border-l-4 border-l-red-300 bg-red-50">●</th>
              <th className="px-2 py-1 border-b border-slate-200 bg-red-50 cursor-pointer hover:bg-red-100 select-none" onClick={() => handleSort('d1')}>{`Score${arrow('d1')}`}</th>
              <th className="px-2 py-1 border-b border-slate-200 bg-red-50">IVA</th>
              <th className="px-2 py-1 border-b border-slate-200 bg-red-50">BES</th>
              <th className="px-2 py-1 border-b border-slate-200 bg-red-50">VAC</th>
              <th className="px-2 py-1 border-b border-slate-200 border-l-4 border-l-emerald-300 bg-emerald-50">●</th>
              <th className="px-2 py-1 border-b border-slate-200 bg-emerald-50 cursor-pointer hover:bg-emerald-100 select-none" onClick={() => handleSort('d2')}>{`Score${arrow('d2')}`}</th>
              <th className="px-2 py-1 border-b border-slate-200 bg-emerald-50">IOE</th>
              <th className="px-2 py-1 border-b border-slate-200 bg-emerald-50">IHE</th>
              <th className="px-2 py-1 border-b border-slate-200 bg-emerald-50">IEA</th>
              <th className="px-2 py-1 border-b border-slate-200 border-l-4 border-l-brand-600/40 bg-brand-50">●</th>
              <th className="px-2 py-1 border-b border-slate-200 bg-brand-50 cursor-pointer hover:bg-brand-100 select-none" onClick={() => handleSort('d3')}>{`Score${arrow('d3')}`}</th>
              <th className="px-2 py-1 border-b border-slate-200 border-l-4 border-l-purple-300 bg-purple-50">●</th>
              <th className="px-2 py-1 border-b border-slate-200 bg-purple-50 cursor-pointer hover:bg-purple-100 select-none" onClick={() => handleSort('d6')}>{`Score${arrow('d6')}`}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(({ id, nombre, kpi }) => {
              const d1 = kpi!.d1_obsolescencia
              const d2 = kpi!.d2_oportunidades
              const d3 = kpi!.d3_mercado
              const d6 = kpi!.d6_estudiantil
              return (
                <tr key={id} className="border-b border-slate-100 hover:bg-slate-50 text-center">
                  <td className="px-3 py-2 text-left text-xs font-semibold text-slate-800">
                    <Link href={`/carreras/${id}`} className="hover:text-brand-700 hover:underline">{nombre}</Link>
                  </td>
                  <td className="px-2 py-2 border-l-4 border-l-red-200 bg-red-50/50"><Dot value={d1.score} isD1={true} /></td>
                  <td className="px-2 py-2 bg-red-50/50"><Bar value={d1.score} isD1={true} /></td>
                  <td className="px-2 py-2 bg-red-50/50"><Sub value={d1.iva} isD1={true} /></td>
                  <td className="px-2 py-2 bg-red-50/50"><Sub value={d1.bes} isD1={true} /></td>
                  <td className="px-2 py-2 bg-red-50/50"><Sub value={d1.vac} isD1={true} /></td>
                  <td className="px-2 py-2 border-l-4 border-l-emerald-200 bg-emerald-50/50"><Dot value={d2.score} isD1={false} /></td>
                  <td className="px-2 py-2 bg-emerald-50/50"><Bar value={d2.score} isD1={false} /></td>
                  <td className="px-2 py-2 bg-emerald-50/50"><Sub value={d2.ioe} isD1={false} /></td>
                  <td className="px-2 py-2 bg-emerald-50/50"><Sub value={d2.ihe} isD1={false} /></td>
                  <td className="px-2 py-2 bg-emerald-50/50"><Sub value={d2.iea} isD1={false} /></td>
                  <td className="px-2 py-2 border-l-4 border-l-brand-600/40 bg-brand-50/50"><Dot value={d3.score} isD1={false} /></td>
                  <td className="px-2 py-2 bg-brand-50/50"><Bar value={d3.score} isD1={false} /></td>
                  <td className="px-2 py-2 border-l-4 border-l-purple-200 bg-purple-50/50"><Dot value={d6.score} isD1={false} /></td>
                  <td className="px-2 py-2 bg-purple-50/50"><Bar value={d6.score} isD1={false} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <p className="px-3 py-2 text-xs text-slate-400 bg-slate-50 border-t border-slate-100">
          <span className="text-red-600">● rojo</span> = alerta ·{' '}
          <span className="text-yellow-600">● amarillo</span> = medio ·{' '}
          <span className="text-emerald-600">● verde</span> = bueno &nbsp;(D1: alto=malo · D2: alto=bueno)
        </p>
      </div>

      {hasMore && (
        <div className="mt-3 flex justify-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="px-4 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            {loadingMore ? 'Cargando...' : 'Cargar más'}
          </button>
        </div>
      )}
      <p className="mt-2 text-xs text-slate-400 text-center">
        {sorted.length} carreras · ordenado por {sortKey.toUpperCase()}
      </p>
    </div>
  )
}

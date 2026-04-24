'use client'
import { useEffect, useState } from 'react'
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
      style={{ boxShadow: '0 0 4px rgba(0,0,0,0.25)' }}
    />
  )
}

function Bar({ value, isD1 }: { value: number; isD1: boolean }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="w-11 bg-gray-200 rounded h-1.5">
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
  const [skip, setSkip] = useState(0)
  const [sortKey, setSortKey] = useState<SortKey>('d1')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getCarrerasPublico({ skip: 0, limit: PAGE_SIZE })
      .then((data) => {
        setRows(data)
        setSkip(data.length)
        setHasMore(data.length === PAGE_SIZE)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function loadMore() {
    setLoadingMore(true)
    try {
      const data = await getCarrerasPublico({ skip, limit: PAGE_SIZE })
      setRows(prev => [...prev, ...data])
      setSkip(s => s + data.length)
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

  if (loading) return <p className="text-gray-400 py-8">Cargando KPIs...</p>
  if (error) return <p className="text-red-500 py-8">Error: {error}</p>
  if (sorted.length === 0)
    return <p className="text-gray-400 py-8">Sin datos de KPIs disponibles. Ejecuta "Seed Demo" en el panel admin.</p>

  return (
    <div>
      <div className="overflow-x-auto rounded border">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-xs text-center">
              <th className="px-3 py-2 border-b text-left" rowSpan={2}>
                Carrera
              </th>
              <th
                colSpan={5}
                className="px-2 py-1.5 border-b border-l-4 border-l-red-300 bg-red-50 text-red-800 tracking-wide"
              >
                D1 — OBSOLESCENCIA
              </th>
              <th
                colSpan={5}
                className="px-2 py-1.5 border-b border-l-4 border-l-green-300 bg-green-50 text-green-800 tracking-wide"
              >
                D2 — OPORTUNIDADES
              </th>
              <th
                colSpan={2}
                className="px-2 py-1.5 border-b border-l-4 border-l-blue-300 bg-blue-50 text-blue-800 tracking-wide"
              >
                D3 — MERCADO
              </th>
              <th
                colSpan={2}
                className="px-2 py-1.5 border-b border-l-4 border-l-purple-300 bg-purple-50 text-purple-800 tracking-wide"
              >
                D6 — ESTUDIANTIL
              </th>
            </tr>
            <tr className="text-xs text-center text-gray-500 bg-gray-50">
              <th className="px-2 py-1 border-b border-l-4 border-l-red-300 bg-red-50">●</th>
              <th
                className="px-2 py-1 border-b bg-red-50 cursor-pointer hover:bg-red-100 select-none"
                onClick={() => handleSort('d1')}
              >
                {`Score${arrow('d1')}`}
              </th>
              <th className="px-2 py-1 border-b bg-red-50">IVA</th>
              <th className="px-2 py-1 border-b bg-red-50">BES</th>
              <th className="px-2 py-1 border-b bg-red-50">VAC</th>
              <th className="px-2 py-1 border-b border-l-4 border-l-green-300 bg-green-50">●</th>
              <th
                className="px-2 py-1 border-b bg-green-50 cursor-pointer hover:bg-green-100 select-none"
                onClick={() => handleSort('d2')}
              >
                {`Score${arrow('d2')}`}
              </th>
              <th className="px-2 py-1 border-b bg-green-50">IOE</th>
              <th className="px-2 py-1 border-b bg-green-50">IHE</th>
              <th className="px-2 py-1 border-b bg-green-50">IEA</th>
              <th className="px-2 py-1 border-b border-l-4 border-l-blue-300 bg-blue-50">●</th>
              <th
                className="px-2 py-1 border-b bg-blue-50 cursor-pointer hover:bg-blue-100 select-none"
                onClick={() => handleSort('d3')}
              >
                {`Score${arrow('d3')}`}
              </th>
              <th className="px-2 py-1 border-b border-l-4 border-l-purple-300 bg-purple-50">●</th>
              <th
                className="px-2 py-1 border-b bg-purple-50 cursor-pointer hover:bg-purple-100 select-none"
                onClick={() => handleSort('d6')}
              >
                {`Score${arrow('d6')}`}
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(({ id, nombre, kpi }) => {
              const d1 = kpi!.d1_obsolescencia
              const d2 = kpi!.d2_oportunidades
              const d3 = kpi!.d3_mercado
              const d6 = kpi!.d6_estudiantil
              return (
                <tr key={id} className="border-b hover:bg-gray-50 text-center">
                  <td className="px-3 py-2 text-left text-xs font-semibold text-gray-800">
                    {nombre}
                  </td>
                  <td className="px-2 py-2 border-l-4 border-l-red-200 bg-red-50/50">
                    <Dot value={d1.score} isD1={true} />
                  </td>
                  <td className="px-2 py-2 bg-red-50/50">
                    <Bar value={d1.score} isD1={true} />
                  </td>
                  <td className="px-2 py-2 bg-red-50/50">
                    <Sub value={d1.iva} isD1={true} />
                  </td>
                  <td className="px-2 py-2 bg-red-50/50">
                    <Sub value={d1.bes} isD1={true} />
                  </td>
                  <td className="px-2 py-2 bg-red-50/50">
                    <Sub value={d1.vac} isD1={true} />
                  </td>
                  <td className="px-2 py-2 border-l-4 border-l-green-200 bg-green-50/50">
                    <Dot value={d2.score} isD1={false} />
                  </td>
                  <td className="px-2 py-2 bg-green-50/50">
                    <Bar value={d2.score} isD1={false} />
                  </td>
                  <td className="px-2 py-2 bg-green-50/50">
                    <Sub value={d2.ioe} isD1={false} />
                  </td>
                  <td className="px-2 py-2 bg-green-50/50">
                    <Sub value={d2.ihe} isD1={false} />
                  </td>
                  <td className="px-2 py-2 bg-green-50/50">
                    <Sub value={d2.iea} isD1={false} />
                  </td>
                  <td className="px-2 py-2 border-l-4 border-l-blue-200 bg-blue-50/50">
                    <Dot value={d3.score} isD1={false} />
                  </td>
                  <td className="px-2 py-2 bg-blue-50/50">
                    <Bar value={d3.score} isD1={false} />
                  </td>
                  <td className="px-2 py-2 border-l-4 border-l-purple-200 bg-purple-50/50">
                    <Dot value={d6.score} isD1={false} />
                  </td>
                  <td className="px-2 py-2 bg-purple-50/50">
                    <Bar value={d6.score} isD1={false} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <p className="px-3 py-2 text-xs text-gray-400">
          <span className="text-red-600">● rojo</span> = alerta ·{' '}
          <span className="text-yellow-600">● amarillo</span> = medio ·{' '}
          <span className="text-green-600">● verde</span> = bueno &nbsp;(D1: alto=malo · D2: alto=bueno)
        </p>
      </div>

      {hasMore && (
        <div className="mt-3 flex justify-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="px-4 py-1.5 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
          >
            {loadingMore ? 'Cargando...' : 'Cargar más'}
          </button>
        </div>
      )}
      <p className="mt-2 text-xs text-gray-400 text-center">
        {sorted.length} carreras · ordenado por {sortKey.toUpperCase()}
      </p>
    </div>
  )
}

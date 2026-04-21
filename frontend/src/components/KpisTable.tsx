'use client'
import { useEffect, useState } from 'react'
import { getKpis } from '@/lib/api'
import { dotColor, textColor } from '@/lib/kpi-colors'
import type { KpiResult } from '@/lib/types'

interface CarreraRow {
  id: number
  nombre: string
  kpi: KpiResult
}

const PROBE_IDS = Array.from({ length: 15 }, (_, i) => i + 1)

type SortKey = 'd1' | 'd2'
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
  const [rows, setRows] = useState<CarreraRow[]>([])
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey>('d1')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  useEffect(() => {
    Promise.all(
      PROBE_IDS.map((id) =>
        getKpis(id).then((kpi) =>
          kpi ? { id, nombre: `Carrera #${id}`, kpi } : null
        )
      )
    ).then((results) => {
      setRows(results.filter((r): r is CarreraRow => r !== null))
    }).finally(() => {
      setLoading(false)
    })
  }, [])

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('desc') }
  }

  const sorted = [...rows].sort((a, b) => {
    const va =
      sortKey === 'd1'
        ? a.kpi.d1_obsolescencia.score
        : a.kpi.d2_oportunidades.score
    const vb =
      sortKey === 'd1'
        ? b.kpi.d1_obsolescencia.score
        : b.kpi.d2_oportunidades.score
    return sortDir === 'desc' ? vb - va : va - vb
  })

  function arrow(key: SortKey) {
    if (sortKey !== key) return ' ↕'
    return sortDir === 'desc' ? ' ↓' : ' ↑'
  }

  if (loading) return <p className="text-gray-400 py-8">Cargando KPIs...</p>
  if (rows.length === 0)
    return <p className="text-gray-400 py-8">Sin datos de KPIs disponibles.</p>

  return (
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
          </tr>
        </thead>
        <tbody>
          {sorted.map(({ id, nombre, kpi }) => {
            const d1 = kpi.d1_obsolescencia
            const d2 = kpi.d2_oportunidades
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
  )
}

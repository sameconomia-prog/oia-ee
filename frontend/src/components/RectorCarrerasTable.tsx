'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { CarreraKpi, BenchmarkCareerSummary } from '@/lib/types'
import { dotColor, textColor } from '@/lib/kpi-colors'
import { getBenchmarkCareers } from '@/lib/api'
import SimuladorModal from './SimuladorModal'

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
        <div className={`${dotColor(value, isD1)} h-1.5 rounded`} style={{ width: `${value * 100}%` }} />
      </div>
      <span className={`text-xs ${textColor(value, isD1)}`}>{value.toFixed(2)}</span>
    </div>
  )
}

function Sub({ value, isD1 }: { value: number; isD1: boolean }) {
  return <span className={`text-xs ${textColor(value, isD1)}`}>{value.toFixed(2)}</span>
}

function Dash() {
  return <span className="text-xs text-gray-400">—</span>
}

function UrgenciaBadge({ score, slug }: { score: number; slug: string }) {
  const { label, color } =
    score >= 60 ? { label: 'Alta', color: 'bg-red-100 text-red-800' } :
    score >= 30 ? { label: 'Mod.', color: 'bg-amber-100 text-amber-800' } :
    { label: 'Baja', color: 'bg-green-100 text-green-800' }
  return (
    <Link href={`/benchmarks/${slug}`} title={`Urgencia curricular global: ${score}/100`}>
      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${color} hover:opacity-80`}>
        {label}
      </span>
    </Link>
  )
}

export default function RectorCarrerasTable({
  carreras,
  iesId,
}: {
  carreras: CarreraKpi[]
  iesId: string
}) {
  const [sortKey, setSortKey] = useState<SortKey>('d1')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [simulando, setSimulando] = useState<string | null>(null)
  const [benchmarkMap, setBenchmarkMap] = useState<Record<string, BenchmarkCareerSummary>>({})

  useEffect(() => {
    getBenchmarkCareers()
      .then(list => {
        const map: Record<string, BenchmarkCareerSummary> = {}
        for (const b of list) map[b.slug] = b
        setBenchmarkMap(map)
      })
      .catch(() => {})
  }, [])

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('desc') }
  }

  function arrow(key: SortKey) {
    if (sortKey !== key) return ' ↕'
    return sortDir === 'desc' ? ' ↓' : ' ↑'
  }

  const sorted = [...carreras].sort((a, b) => {
    const va = sortKey === 'd1' ? (a.kpi?.d1_obsolescencia.score ?? -1) : (a.kpi?.d2_oportunidades.score ?? -1)
    const vb = sortKey === 'd1' ? (b.kpi?.d1_obsolescencia.score ?? -1) : (b.kpi?.d2_oportunidades.score ?? -1)
    return sortDir === 'desc' ? vb - va : va - vb
  })

  const carreraSimulando = simulando ? carreras.find((c) => c.id === simulando) ?? null : null

  function exportarCSV() {
    const header = 'Carrera,Matrícula,D1 Score,D1-IVA,D1-BES,D1-VAC,D2 Score,D2-IOE,D2-IHE,D2-IEA'
    const rows = sorted.map(({ nombre, matricula, kpi }) => {
      const d1 = kpi?.d1_obsolescencia
      const d2 = kpi?.d2_oportunidades
      return [
        `"${nombre}"`,
        matricula ?? '',
        d1 ? d1.score.toFixed(4) : '',
        d1 ? d1.iva.toFixed(4) : '',
        d1 ? d1.bes.toFixed(4) : '',
        d1 ? d1.vac.toFixed(4) : '',
        d2 ? d2.score.toFixed(4) : '',
        d2 ? d2.ioe.toFixed(4) : '',
        d2 ? d2.ihe.toFixed(4) : '',
        d2 ? d2.iea.toFixed(4) : '',
      ].join(',')
    })
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const fecha = new Date().toISOString().slice(0, 10)
    a.href = url
    a.download = `kpis_carreras_rector_${fecha}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (carreras.length === 0) {
    return <p className="text-gray-400 py-8 text-sm">Sin carreras registradas para esta IES.</p>
  }

  return (
    <>
      {carreraSimulando && (
        <SimuladorModal
          carrera={carreraSimulando}
          iesId={iesId}
          onClose={() => setSimulando(null)}
        />
      )}
      <div className="flex justify-end mb-2">
        <button
          onClick={exportarCSV}
          className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs rounded border hover:bg-gray-200"
        >
          Exportar CSV
        </button>
      </div>
      <div className="overflow-x-auto rounded border">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-xs text-center">
              <th className="px-3 py-2 border-b text-left" rowSpan={2}>Carrera</th>
              <th className="px-2 py-2 border-b text-right text-gray-500" rowSpan={2}>Matrícula</th>
              <th colSpan={5} className="px-2 py-1.5 border-b border-l-4 border-l-red-300 bg-red-50 text-red-800 tracking-wide">
                D1 — OBSOLESCENCIA
              </th>
              <th colSpan={5} className="px-2 py-1.5 border-b border-l-4 border-l-green-300 bg-green-50 text-green-800 tracking-wide">
                D2 — OPORTUNIDADES
              </th>
              <th className="px-2 py-2 border-b text-gray-500 text-xs" rowSpan={2}>Global</th>
              <th className="px-2 py-2 border-b text-gray-500 text-xs" rowSpan={2}>Acción</th>
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
            {sorted.map(({ id, nombre, matricula, kpi, benchmark_slug }) => {
              const d1 = kpi?.d1_obsolescencia
              const d2 = kpi?.d2_oportunidades
              const bench = benchmark_slug ? benchmarkMap[benchmark_slug] : null
              return (
                <tr key={id} className="border-b hover:bg-gray-50 text-center">
                  <td className="px-3 py-2 text-left text-xs font-semibold text-gray-800">{nombre}</td>
                  <td className="px-3 py-2 text-right text-xs text-gray-500">{matricula ?? '—'}</td>
                  <td className="px-2 py-2 border-l-4 border-l-red-200 bg-red-50/50">
                    {d1 ? <Dot value={d1.score} isD1={true} /> : <Dash />}
                  </td>
                  <td className="px-2 py-2 bg-red-50/50">
                    {d1 ? <Bar value={d1.score} isD1={true} /> : <Dash />}
                  </td>
                  <td className="px-2 py-2 bg-red-50/50">
                    {d1 ? <Sub value={d1.iva} isD1={true} /> : <Dash />}
                  </td>
                  <td className="px-2 py-2 bg-red-50/50">
                    {d1 ? <Sub value={d1.bes} isD1={true} /> : <Dash />}
                  </td>
                  <td className="px-2 py-2 bg-red-50/50">
                    {d1 ? <Sub value={d1.vac} isD1={true} /> : <Dash />}
                  </td>
                  <td className="px-2 py-2 border-l-4 border-l-green-200 bg-green-50/50">
                    {d2 ? <Dot value={d2.score} isD1={false} /> : <Dash />}
                  </td>
                  <td className="px-2 py-2 bg-green-50/50">
                    {d2 ? <Bar value={d2.score} isD1={false} /> : <Dash />}
                  </td>
                  <td className="px-2 py-2 bg-green-50/50">
                    {d2 ? <Sub value={d2.ioe} isD1={false} /> : <Dash />}
                  </td>
                  <td className="px-2 py-2 bg-green-50/50">
                    {d2 ? <Sub value={d2.ihe} isD1={false} /> : <Dash />}
                  </td>
                  <td className="px-2 py-2 bg-green-50/50">
                    {d2 ? <Sub value={d2.iea} isD1={false} /> : <Dash />}
                  </td>
                  <td className="px-2 py-2">
                    {bench ? (
                      <UrgenciaBadge score={bench.urgencia_curricular} slug={bench.slug} />
                    ) : <Dash />}
                  </td>
                  <td className="px-2 py-2">
                    <button
                      onClick={() => setSimulando(id)}
                      className="text-xs text-blue-600 hover:text-blue-800 whitespace-nowrap"
                    >
                      Simular →
                    </button>
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
    </>
  )
}

'use client'
import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { getCarrerasPublico, getBenchmarkCareers } from '@/lib/api'
import type { CarreraKpi, KpiResult } from '@/lib/types'

export interface DimConfig {
  dimKey: 'D1' | 'D2' | 'D3' | 'D6'
  extract: (kpi: KpiResult) => { score: number; subFields: Record<string, number> }
  subFieldLabels: Array<{ key: string; label: string }>
  invert: boolean
  sortLabel: string
  csvFilename: string
  legend: string
}

export const DIM_CONFIGS: Record<'D1' | 'D2' | 'D3' | 'D6', DimConfig> = {
  D1: {
    dimKey: 'D1',
    extract: (kpi) => ({
      score: kpi.d1_obsolescencia.score,
      subFields: { iva: kpi.d1_obsolescencia.iva, bes: kpi.d1_obsolescencia.bes, vac: kpi.d1_obsolescencia.vac },
    }),
    subFieldLabels: [{ key: 'iva', label: 'IVA' }, { key: 'bes', label: 'BES' }, { key: 'vac', label: 'VAC' }],
    invert: true,
    sortLabel: 'mayor riesgo primero',
    csvFilename: 'ranking_d1_carreras',
    legend: 'D1 Obsolescencia · IVA: vulnerabilidad · BES: brecha curricular · VAC: velocidad cambio',
  },
  D2: {
    dimKey: 'D2',
    extract: (kpi) => ({
      score: kpi.d2_oportunidades.score,
      subFields: { ioe: kpi.d2_oportunidades.ioe, ihe: kpi.d2_oportunidades.ihe, iea: kpi.d2_oportunidades.iea },
    }),
    subFieldLabels: [{ key: 'ioe', label: 'IOE ↑' }, { key: 'ihe', label: 'IHE ↑' }, { key: 'iea', label: 'IEA ↑' }],
    invert: false,
    sortLabel: 'mayor oportunidad primero',
    csvFilename: 'ranking_d2_carreras',
    legend: 'D2 Oportunidades · IOE: oportunidades empleo · IHE: habilitación emergente · IEA: empleabilidad ajustada',
  },
  D3: {
    dimKey: 'D3',
    extract: (kpi) => ({
      score: kpi.d3_mercado.score,
      subFields: { tdm: kpi.d3_mercado.tdm, tvc: kpi.d3_mercado.tvc, brs: kpi.d3_mercado.brs, ice: kpi.d3_mercado.ice },
    }),
    subFieldLabels: [{ key: 'tdm', label: 'TDM' }, { key: 'tvc', label: 'TVC' }, { key: 'brs', label: 'BRS' }, { key: 'ice', label: 'ICE' }],
    invert: false,
    sortLabel: 'mayor relevancia primero',
    csvFilename: 'ranking_d3_carreras',
    legend: 'D3 Mercado Laboral · TDM: demanda en mercado · TVC: tendencia vacantes IA · BRS: brecha reskilling · ICE: competencias emergentes',
  },
  D6: {
    dimKey: 'D6',
    extract: (kpi) => ({
      score: kpi.d6_estudiantil.score,
      subFields: { iei: kpi.d6_estudiantil.iei, crc: kpi.d6_estudiantil.crc, roi_e: kpi.d6_estudiantil.roi_e },
    }),
    subFieldLabels: [{ key: 'iei', label: 'IEI' }, { key: 'crc', label: 'CRC' }, { key: 'roi_e', label: 'ROI-E' }],
    invert: false,
    sortLabel: 'mayor retorno primero',
    csvFilename: 'ranking_d6_carreras',
    legend: 'D6 Perfil Estudiantil · IEI: eficiencia inversión · CRC: retorno competencias · ROI-E: retorno inversión educativa',
  },
}

function scoreBadgeClass(s: number, invert: boolean): string {
  const isHigh = s >= 0.6
  const isMid = s >= 0.4 && s < 0.6
  if (invert) {
    if (isHigh) return 'text-red-700 bg-red-50'
    if (isMid) return 'text-yellow-700 bg-yellow-50'
    return 'text-emerald-700 bg-emerald-50'
  }
  if (isHigh) return 'text-emerald-700 bg-emerald-50'
  if (isMid) return 'text-yellow-700 bg-yellow-50'
  return 'text-red-700 bg-red-50'
}

function scoreTextClass(s: number, invert: boolean): string {
  const isHigh = s >= 0.6
  const isMid = s >= 0.4 && s < 0.6
  if (invert) {
    if (isHigh) return 'text-red-700'
    if (isMid) return 'text-yellow-700'
    return 'text-emerald-700'
  }
  if (isHigh) return 'text-emerald-700'
  if (isMid) return 'text-yellow-700'
  return 'text-red-700'
}

type RowData = { id: string; nombre: string; score: number; subFields: Record<string, number>; benchmark_slug?: string | null }

interface CarrerasRankingProps {
  config: DimConfig
  filterQuery?: string
}

export default function CarrerasRanking({ config, filterQuery = '' }: CarrerasRankingProps) {
  const [raw, setRaw] = useState<CarreraKpi[]>([])
  const [benchmarkMap, setBenchmarkMap] = useState<Map<string, number>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      getCarrerasPublico({ limit: 500 }),
      getBenchmarkCareers().catch(() => []),
    ])
      .then(([carreras, benchmarks]) => {
        setRaw(carreras)
        setBenchmarkMap(new Map(benchmarks.map(b => [b.slug, b.urgencia_curricular])))
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const datos: RowData[] = useMemo(() => {
    return raw
      .filter((c): c is CarreraKpi & { kpi: NonNullable<CarreraKpi['kpi']> } => c.kpi !== null)
      .map(c => {
        const { score, subFields } = config.extract(c.kpi!)
        return { id: c.id, nombre: c.nombre, score, subFields, benchmark_slug: c.benchmark_slug }
      })
      .sort((a, b) => b.score - a.score)
      .filter(d => !filterQuery || d.nombre.toLowerCase().includes(filterQuery.toLowerCase()))
  }, [raw, filterQuery, config])

  const stats = useMemo(() => {
    if (datos.length === 0) return null
    const scores = datos.map(d => d.score)
    const promedio = scores.reduce((a, b) => a + b, 0) / scores.length
    const alto = scores.filter(s => s >= 0.6).length
    const medio = scores.filter(s => s >= 0.4 && s < 0.6).length
    const bajo = scores.filter(s => s < 0.4).length
    return { promedio, alto, medio, bajo, mayor: datos[0], menor: datos[datos.length - 1] }
  }, [datos])

  function exportarCSV() {
    if (datos.length === 0) return
    const subCols = config.subFieldLabels.map(f => f.label.replace(' ↑', '')).join(',')
    const header = `#,Carrera,${config.dimKey} Score,${subCols}`
    const rows = datos.map(({ nombre, score, subFields }, i) => {
      const subs = config.subFieldLabels.map(f => subFields[f.key].toFixed(4)).join(',')
      return `${i + 1},"${nombre}",${score.toFixed(4)},${subs}`
    })
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${config.csvFilename}_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <p className="text-sm text-slate-400 py-8 text-center">Cargando carreras...</p>
  if (error) return <p className="text-sm text-red-500 py-4">Error: {error}</p>
  if (datos.length === 0) return <p className="text-sm text-slate-400 py-8 text-center">Sin datos de carreras.</p>

  const { invert } = config

  return (
    <div>
      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <span className="text-xs text-slate-400">
          {datos.length} carreras · ordenado por {config.dimKey} Score ({config.sortLabel})
        </span>
        <button
          onClick={exportarCSV}
          className="ml-auto px-3 py-1.5 bg-slate-100 text-slate-600 text-xs rounded-lg border border-slate-200 hover:bg-slate-200 transition-colors"
        >
          Exportar CSV
        </button>
      </div>

      {stats && (
        <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="border border-slate-200 rounded-lg p-3 bg-white">
            <p className="text-xs text-slate-500 mb-1">Promedio {config.dimKey} nacional</p>
            <p className={`text-lg font-mono font-semibold ${scoreTextClass(stats.promedio, invert)}`}>
              {stats.promedio.toFixed(3)}
            </p>
          </div>
          <div className="border border-slate-200 rounded-lg p-3 bg-white">
            <p className="text-xs text-slate-500 mb-1">
              {invert ? 'Mayor riesgo' : 'Mayor potencial'}
            </p>
            <p className={`text-sm font-semibold truncate ${invert ? 'text-red-700' : 'text-emerald-700'}`}>
              {stats.mayor.nombre}
            </p>
            <p className={`text-xs font-mono ${invert ? 'text-red-600' : 'text-emerald-600'}`}>
              {stats.mayor.score.toFixed(3)}
            </p>
          </div>
          <div className="border border-slate-200 rounded-lg p-3 bg-white">
            <p className="text-xs text-slate-500 mb-1">
              {invert ? 'Menor riesgo' : 'Menor potencial'}
            </p>
            <p className={`text-sm font-semibold truncate ${invert ? 'text-emerald-700' : 'text-red-700'}`}>
              {stats.menor.nombre}
            </p>
            <p className={`text-xs font-mono ${invert ? 'text-emerald-600' : 'text-red-600'}`}>
              {stats.menor.score.toFixed(3)}
            </p>
          </div>
          <div className="border border-slate-200 rounded-lg p-3 bg-white">
            <p className="text-xs text-slate-500 mb-2">Distribución</p>
            <div className="flex gap-2 text-xs font-semibold">
              {invert ? (
                <>
                  <span className="text-red-700">{stats.alto} alto</span>
                  <span className="text-yellow-700">{stats.medio} med</span>
                  <span className="text-emerald-700">{stats.bajo} bajo</span>
                </>
              ) : (
                <>
                  <span className="text-emerald-700">{stats.alto} alto</span>
                  <span className="text-yellow-700">{stats.medio} med</span>
                  <span className="text-red-700">{stats.bajo} bajo</span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
            <tr>
              <th className="px-4 py-2 text-left w-8">#</th>
              <th className="px-4 py-2 text-left">Carrera</th>
              <th className="px-4 py-2 text-center">{config.dimKey} Score</th>
              {config.subFieldLabels.map(f => (
                <th key={f.key} className="px-4 py-2 text-center">{f.label}</th>
              ))}
              <th className="px-4 py-2 text-center text-violet-500" title="Urgencia curricular global (benchmarks internacionales)">U</th>
            </tr>
          </thead>
          <tbody>
            {datos.map(({ id, nombre, score, subFields, benchmark_slug }, i) => {
              const urgencia = benchmark_slug ? benchmarkMap.get(benchmark_slug) : undefined
              const uCls = urgencia == null ? '' : urgencia >= 60 ? 'text-red-600' : urgencia >= 30 ? 'text-amber-600' : 'text-emerald-600'
              return (
              <tr key={id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-2 text-slate-400 font-mono text-xs">{i + 1}</td>
                <td className="px-4 py-2 font-medium text-slate-700">
                  <Link href={`/carreras/${id}`} className="hover:text-brand-700 hover:underline">
                    {nombre}
                  </Link>
                </td>
                <td className="px-4 py-2 text-center">
                  <span className={`px-2 py-0.5 rounded text-xs font-mono font-semibold ${scoreBadgeClass(score, invert)}`}>
                    {score.toFixed(2)}
                  </span>
                </td>
                {config.subFieldLabels.map(f => (
                  <td key={f.key} className="px-4 py-2 text-center font-mono text-xs text-slate-500">
                    {subFields[f.key].toFixed(3)}
                  </td>
                ))}
                <td className="px-4 py-2 text-center font-mono text-xs">
                  {urgencia != null ? (
                    <Link href={`/benchmarks/${benchmark_slug}`} className={`font-bold hover:underline ${uCls}`}>{urgencia}</Link>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
              </tr>
              )
            })}
          </tbody>
        </table>
        <p className="text-xs text-slate-400 px-4 py-2 bg-slate-50 border-t border-slate-100">
          {config.legend}
        </p>
      </div>
    </div>
  )
}

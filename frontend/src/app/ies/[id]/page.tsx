'use client'
import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { getIesDetalle, getCarrerasDeIes, getBenchmarkCareers } from '@/lib/api'
import type { IesDetalle, CarreraKpi, BenchmarkCareerSummary } from '@/lib/types'

function ScoreBadge({ label, score, invert }: { label: string; score: number; invert?: boolean }) {
  const bad = invert ? score >= 0.6 : score < 0.4
  const ok = invert ? score < 0.4 : score >= 0.6
  const color = ok ? 'bg-green-50 text-green-700' : bad ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-mono font-semibold ${color}`}>
      {label} {score.toFixed(2)}
    </span>
  )
}

function UrgenciaMini({ score, slug }: { score: number; slug: string }) {
  const { label, color } =
    score >= 60 ? { label: `Urgencia alta (${score})`, color: 'bg-red-50 text-red-700 border-red-200' } :
    score >= 30 ? { label: `Urgencia media (${score})`, color: 'bg-amber-50 text-amber-700 border-amber-200' } :
    { label: `Urgencia baja (${score})`, color: 'bg-green-50 text-green-700 border-green-200' }
  return (
    <Link
      href={`/benchmarks/${slug}`}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-semibold whitespace-nowrap ${color}`}
      title={`Urgencia curricular benchmark global: ${score}/100`}
    >
      <span>Benchmark</span>
      <span className="font-mono">{score}</span>
    </Link>
  )
}

export default function IesDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [detalle, setDetalle] = useState<IesDetalle | null>(null)
  const [carreras, setCarreras] = useState<CarreraKpi[]>([])
  const [benchmarkList, setBenchmarkList] = useState<BenchmarkCareerSummary[]>([])
  const [sortByUrgencia, setSortByUrgencia] = useState(false)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return
    Promise.all([
      getIesDetalle(id),
      getCarrerasDeIes(id),
      getBenchmarkCareers().catch(() => []),
    ])
      .then(([det, cs, bms]) => {
        setDetalle(det)
        setCarreras(cs)
        setBenchmarkList(bms)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  const benchmarkMap = useMemo(
    () => Object.fromEntries(benchmarkList.map(b => [b.slug, b])),
    [benchmarkList]
  )

  const portfolioUrgencia = useMemo(() => {
    const scores = carreras
      .filter(c => c.benchmark_slug && benchmarkMap[c.benchmark_slug])
      .map(c => benchmarkMap[c.benchmark_slug!].urgencia_curricular)
    if (scores.length === 0) return null
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
  }, [carreras, benchmarkMap])

  const nationalAvgUrgencia = useMemo(() => {
    if (benchmarkList.length === 0) return null
    return Math.round(benchmarkList.reduce((a, b) => a + b.urgencia_curricular, 0) / benchmarkList.length)
  }, [benchmarkList])

  if (loading) {
    return <p className="text-gray-400 text-sm py-8 text-center">Cargando...</p>
  }

  if (notFound || !detalle) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 text-sm mb-4">IES no encontrada.</p>
        <Link href="/ies" className="text-indigo-600 text-sm hover:underline">← Ver instituciones</Link>
      </div>
    )
  }

  const d1Color = detalle.promedio_d1 >= 0.6 ? 'text-red-700' : detalle.promedio_d1 >= 0.4 ? 'text-yellow-700' : 'text-green-700'
  const d2Color = detalle.promedio_d2 >= 0.6 ? 'text-green-700' : detalle.promedio_d2 >= 0.4 ? 'text-yellow-700' : 'text-red-700'

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Link href="/ies" className="text-xs text-indigo-600 hover:underline">← Instituciones</Link>
        <div className="flex items-start justify-between gap-3 mt-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{detalle.nombre}</h1>
            {detalle.nombre_corto && (
              <p className="text-sm text-gray-500">{detalle.nombre_corto}</p>
            )}
          </div>
          <Link
            href={`/comparar?iesA=${id}`}
            className="shrink-0 mt-1 px-4 py-2 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 transition-colors"
          >
            ⚖️ Comparar
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <div className="bg-white border rounded-xl p-4 text-center shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Carreras</p>
          <p className="text-2xl font-bold text-indigo-600">{detalle.total_carreras}</p>
        </div>
        <div className="bg-white border rounded-xl p-4 text-center shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Promedio D1</p>
          <p className={`text-2xl font-bold font-mono ${d1Color}`}>{detalle.promedio_d1.toFixed(2)}</p>
          <p className="text-[10px] text-gray-400">Obsolescencia</p>
        </div>
        <div className="bg-white border rounded-xl p-4 text-center shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Promedio D2</p>
          <p className={`text-2xl font-bold font-mono ${d2Color}`}>{detalle.promedio_d2.toFixed(2)}</p>
          <p className="text-[10px] text-gray-400">Oportunidades</p>
        </div>
        <div className="bg-white border rounded-xl p-4 text-center shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Riesgo alto</p>
          <p className={`text-2xl font-bold ${detalle.carreras_riesgo_alto > 0 ? 'text-red-600' : 'text-gray-400'}`}>
            {detalle.carreras_riesgo_alto}
          </p>
          <p className="text-[10px] text-gray-400">D1 ≥ 0.6</p>
        </div>
        {portfolioUrgencia !== null && (
          <Link
            href="/benchmarks"
            className={`bg-white border rounded-xl p-4 text-center shadow-sm hover:shadow-md transition-shadow ${portfolioUrgencia >= 60 ? 'border-red-200 bg-red-50/40' : portfolioUrgencia >= 30 ? 'border-amber-200 bg-amber-50/40' : 'border-green-200 bg-green-50/40'}`}
          >
            <p className="text-xs text-gray-500 mb-1">Urgencia media</p>
            <p className={`text-2xl font-bold font-mono ${portfolioUrgencia >= 60 ? 'text-red-700' : portfolioUrgencia >= 30 ? 'text-amber-700' : 'text-green-700'}`}>
              {portfolioUrgencia}
            </p>
            <p className="text-[10px] text-gray-400">Portfolio global</p>
            {nationalAvgUrgencia !== null && (
              <p className={`text-[10px] mt-0.5 font-medium ${portfolioUrgencia > nationalAvgUrgencia ? 'text-red-500' : 'text-green-600'}`}>
                vs. {nationalAvgUrgencia} nac.
              </p>
            )}
          </Link>
        )}
      </div>

      {/* Carta a rectores — contextual link when urgencia alta */}
      {portfolioUrgencia !== null && portfolioUrgencia >= 60 && (
        <div className="mb-4 rounded-xl bg-indigo-50 border border-indigo-200 px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-indigo-800">Tu institución tiene urgencia curricular alta</p>
            <p className="text-[11px] text-indigo-600 mt-0.5">Lee la guía de primeros pasos accionables para rectores</p>
          </div>
          <Link
            href="/investigaciones/2026-05-carta-rectores-urgencia-curricular"
            className="shrink-0 text-xs font-semibold text-indigo-700 border border-indigo-300 bg-white px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors whitespace-nowrap"
          >
            Leer carta →
          </Link>
        </div>
      )}

      {/* Carreras */}
      <div className="bg-white rounded-xl border shadow-sm">
        <div className="px-5 py-4 border-b flex items-center justify-between gap-2 flex-wrap">
          <h2 className="font-semibold text-gray-800 text-sm">
            Carreras ({carreras.length})
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSortByUrgencia(v => !v)}
              className={`text-xs px-3 py-1 border rounded transition-colors ${sortByUrgencia ? 'bg-violet-50 border-violet-300 text-violet-700' : 'hover:bg-gray-50 text-gray-500'}`}
              title="Ordenar por urgencia curricular global"
            >
              {sortByUrgencia ? '↓ Urgencia' : 'Ordenar por U'}
            </button>
          {carreras.length > 0 && (
            <button
              onClick={() => {
                const headers = ['Carrera', 'Matrícula', 'D1 Riesgo', 'D2 Oportunidades', 'D3 Mercado', 'D6 Estudiantil', 'Urgencia Benchmark']
                const rows = carreras.map(c => {
                  const bm = c.benchmark_slug ? benchmarkMap[c.benchmark_slug] : null
                  return [
                    c.nombre,
                    c.matricula ?? '',
                    c.kpi?.d1_obsolescencia.score.toFixed(4) ?? '',
                    c.kpi?.d2_oportunidades.score.toFixed(4) ?? '',
                    c.kpi?.d3_mercado.score.toFixed(4) ?? '',
                    c.kpi?.d6_estudiantil.score.toFixed(4) ?? '',
                    bm?.urgencia_curricular ?? '',
                  ]
                })
                const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
                const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `carreras_${detalle.nombre_corto ?? detalle.nombre}_${new Date().toISOString().slice(0, 10)}.csv`
                a.click()
                URL.revokeObjectURL(url)
              }}
              className="text-xs px-3 py-1 border rounded hover:bg-gray-50 text-gray-600"
            >
              ↓ CSV
            </button>
          )}
          </div>
        </div>

        {carreras.length === 0 && (
          <p className="text-gray-400 text-sm px-5 py-8 text-center">Sin carreras registradas.</p>
        )}

        {[...carreras].sort((a, b) => {
          if (!sortByUrgencia) return 0
          const uA = a.benchmark_slug ? (benchmarkMap[a.benchmark_slug]?.urgencia_curricular ?? -1) : -1
          const uB = b.benchmark_slug ? (benchmarkMap[b.benchmark_slug]?.urgencia_curricular ?? -1) : -1
          return uB - uA
        }).map(c => {
          const bm = c.benchmark_slug ? benchmarkMap[c.benchmark_slug] : null
          return (
            <div key={c.id} className="px-5 py-4 border-b last:border-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link href={`/carreras/${c.id}`} className="text-sm font-medium text-gray-800 hover:text-indigo-700 hover:underline">
                      {c.nombre}
                    </Link>
                    {bm && <UrgenciaMini score={bm.urgencia_curricular} slug={bm.slug} />}
                  </div>
                  {c.matricula != null && (
                    <p className="text-xs text-gray-400 mt-0.5">Matrícula: {c.matricula.toLocaleString()}</p>
                  )}
                </div>
                {c.kpi && (
                  <div className="flex gap-1.5 flex-wrap justify-end">
                    <ScoreBadge label="D1" score={c.kpi.d1_obsolescencia.score} invert />
                    <ScoreBadge label="D2" score={c.kpi.d2_oportunidades.score} />
                    <ScoreBadge label="D3" score={c.kpi.d3_mercado.score} />
                    <ScoreBadge label="D6" score={c.kpi.d6_estudiantil.score} />
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Pertinencia CTA */}
      <div className="mt-6 rounded-xl bg-indigo-50 border border-indigo-200 px-4 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-indigo-800">¿Eres coordinador académico de esta institución?</p>
          <p className="text-[11px] text-indigo-600 mt-0.5">Solicita el análisis de pertinencia curricular personalizado — gratuito, en 5 días hábiles.</p>
        </div>
        <Link
          href={`/pertinencia?ies=${encodeURIComponent(detalle.nombre)}`}
          className="shrink-0 text-xs font-semibold text-indigo-700 border border-indigo-300 bg-white px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors whitespace-nowrap"
        >
          Solicitar análisis →
        </Link>
      </div>
    </div>
  )
}

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

  const distribucionD1 = useMemo(() => {
    const withKpi = carreras.filter(c => c.kpi != null)
    if (withKpi.length === 0) return null
    const bajo = withKpi.filter(c => c.kpi!.d1_obsolescencia.score < 0.4).length
    const medio = withKpi.filter(c => c.kpi!.d1_obsolescencia.score >= 0.4 && c.kpi!.d1_obsolescencia.score < 0.6).length
    const alto = withKpi.filter(c => c.kpi!.d1_obsolescencia.score >= 0.6).length
    return { bajo, medio, alto, total: withKpi.length }
  }, [carreras])

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
          <div className="flex items-center gap-2 mt-1 shrink-0">
            <button
              onClick={() => {
                const lines = [
                  `📊 Diagnóstico IA — ${detalle.nombre}`,
                  `Promedio D1 Obsolescencia: ${detalle.promedio_d1.toFixed(2)} | D2 Oportunidades: ${detalle.promedio_d2.toFixed(2)}`,
                  detalle.carreras_riesgo_alto > 0 ? `Carreras en riesgo alto (D1 ≥ 0.60): ${detalle.carreras_riesgo_alto}` : '',
                  portfolioUrgencia != null ? `Urgencia curricular portfolio: ${portfolioUrgencia}/100` : '',
                  `Ver análisis completo: https://oia-ee.mx/ies/${id}`,
                  'Fuente: OIA-EE — Observatorio de Impacto IA en Educación y Empleo',
                ].filter(Boolean).join('\n')
                navigator.clipboard.writeText(lines).catch(() => {})
              }}
              className="text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded hover:bg-gray-50 transition-colors font-medium"
              title="Copiar resumen diagnóstico"
            >
              Copiar
            </button>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`https://oia-ee.mx/ies/${id}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 border border-blue-200 px-3 py-1.5 rounded hover:bg-blue-50 transition-colors font-medium"
            >
              LinkedIn
            </a>
            <Link
              href={`/comparar?iesA=${id}`}
              className="px-4 py-1.5 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 transition-colors"
            >
              ⚖️ Comparar
            </Link>
          </div>
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

      {/* Distribución D1 mini chart */}
      {distribucionD1 && distribucionD1.total > 1 && (
        <div className="mb-4 bg-white rounded-xl border shadow-sm px-4 py-3">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Distribución de riesgo D1 — portfolio</p>
          <div className="space-y-1.5">
            {([
              { label: 'Alto  (≥0.60)', count: distribucionD1.alto, color: 'bg-red-500' },
              { label: 'Medio (0.40–0.59)', count: distribucionD1.medio, color: 'bg-yellow-400' },
              { label: 'Bajo  (<0.40)', count: distribucionD1.bajo, color: 'bg-emerald-500' },
            ]).map(({ label, count, color }) => (
              <div key={label} className="flex items-center gap-2">
                <span className="text-[10px] text-gray-500 w-32 shrink-0 font-mono">{label}</span>
                <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${color} transition-all`}
                    style={{ width: `${(count / distribucionD1.total) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono text-gray-600 w-6 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Perfil de riesgo — narrative interpretation for non-technical rectors */}
      {(() => {
        const d1Level = detalle.promedio_d1 >= 0.6 ? 'alto' : detalle.promedio_d1 >= 0.4 ? 'moderado' : 'bajo'
        const d1Color = detalle.promedio_d1 >= 0.6 ? 'text-red-700' : detalle.promedio_d1 >= 0.4 ? 'text-yellow-700' : 'text-green-700'
        const d2Level = detalle.promedio_d2 >= 0.6 ? 'alta' : detalle.promedio_d2 >= 0.4 ? 'moderada' : 'baja'
        const urgDelta = portfolioUrgencia !== null && nationalAvgUrgencia !== null
          ? portfolioUrgencia - nationalAvgUrgencia
          : null
        return (
          <div className="mb-4 rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Perfil de riesgo</p>
            <p className="text-sm text-gray-700 leading-relaxed">
              {'Riesgo de obsolescencia '}
              <span className={`font-semibold ${d1Color}`}>{d1Level}</span>
              {` (D1 ${detalle.promedio_d1.toFixed(2)})`}
              {detalle.carreras_riesgo_alto > 0 && (
                <> — <span className="font-semibold text-red-700">{detalle.carreras_riesgo_alto} carrera{detalle.carreras_riesgo_alto !== 1 ? 's' : ''}</span> requieren atención inmediata</>
              )}
              {'. '}
              {`Oportunidades curriculares `}
              <span className={`font-semibold ${detalle.promedio_d2 >= 0.6 ? 'text-green-700' : detalle.promedio_d2 >= 0.4 ? 'text-yellow-700' : 'text-red-700'}`}>{d2Level}s</span>
              {` (D2 ${detalle.promedio_d2.toFixed(2)})`}
              {portfolioUrgencia !== null && (
                <>
                  {'. Urgencia curricular global del portfolio: '}
                  <span className={`font-semibold ${portfolioUrgencia >= 60 ? 'text-red-700' : portfolioUrgencia >= 30 ? 'text-amber-700' : 'text-green-700'}`}>
                    {portfolioUrgencia}/100
                  </span>
                  {urgDelta !== null && (
                    <span className={`text-xs ml-1 ${urgDelta > 0 ? 'text-red-500' : 'text-green-600'}`}>
                      ({urgDelta > 0 ? `+${urgDelta}` : urgDelta} vs. promedio nacional)
                    </span>
                  )}
                </>
              )}
              .
            </p>
          </div>
        )
      })()}

      {/* Carrera prioritaria — first intervention target */}
      {(() => {
        const riesgoAltas = carreras.filter(c => (c.kpi?.d1_obsolescencia.score ?? 0) >= 0.6)
        if (riesgoAltas.length === 0) return null
        const top = [...riesgoAltas].sort((a, b) => (b.kpi?.d1_obsolescencia.score ?? 0) - (a.kpi?.d1_obsolescencia.score ?? 0))[0]
        const bm = top.benchmark_slug ? benchmarkMap[top.benchmark_slug] : null
        return (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50/60 px-4 py-3">
            <p className="text-[10px] font-semibold text-red-500 uppercase tracking-widest mb-1.5">
              Intervención prioritaria — {riesgoAltas.length} carrera{riesgoAltas.length !== 1 ? 's' : ''} en riesgo alto
            </p>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <Link href={`/carreras/${top.id}`} className="text-sm font-semibold text-red-900 hover:underline">
                  {top.nombre}
                </Link>
                <div className="flex gap-1.5 mt-1 flex-wrap">
                  {top.kpi && (
                    <>
                      <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                        D1 {top.kpi.d1_obsolescencia.score.toFixed(2)}
                      </span>
                      <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${top.kpi.d2_oportunidades.score >= 0.4 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        D2 {top.kpi.d2_oportunidades.score.toFixed(2)}
                      </span>
                    </>
                  )}
                  {bm && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">U {bm.urgencia_curricular}/100</span>}
                </div>
              </div>
              <Link
                href={`/pertinencia?ies=${encodeURIComponent(detalle.nombre)}&carrera=${encodeURIComponent(top.nombre)}`}
                className="shrink-0 text-xs font-semibold text-red-700 border border-red-300 bg-white px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors whitespace-nowrap"
              >
                Solicitar análisis →
              </Link>
            </div>
          </div>
        )
      })()}

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

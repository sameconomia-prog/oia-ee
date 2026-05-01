import { getAllInvestigaciones, getTipoLabel, getTopTags } from '@/lib/investigaciones'
import type { TipoInvestigacion } from '@/lib/investigaciones'
import { BENCHMARK_ALL_ARTICLES, BENCHMARK_LABELS, ARTICLE_TO_BENCHMARK } from '@/lib/benchmark-articles'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Investigaciones — OIA-EE',
  description: 'Reportes, análisis y perspectivas sobre el impacto de la IA en la educación superior y el empleo en México.',
}

const TIPO_COLOR: Record<string, string> = {
  reporte: 'bg-blue-100 text-blue-800',
  analisis: 'bg-purple-100 text-purple-800',
  carta: 'bg-green-100 text-green-800',
  nota: 'bg-yellow-100 text-yellow-800',
  metodologia: 'bg-gray-100 text-gray-800',
}

const TIPOS: TipoInvestigacion[] = ['reporte', 'analisis', 'carta', 'nota', 'metodologia']


export default function InvestigacionesPage({
  searchParams,
}: {
  searchParams: { tipo?: string; q?: string; benchmark?: string }
}) {
  const todas = getAllInvestigaciones()
  const topTags = getTopTags(18)
  const filtro = searchParams.tipo as TipoInvestigacion | undefined
  const query = searchParams.q?.toLowerCase().trim() ?? ''
  const benchmarkFilter = searchParams.benchmark ?? ''

  const investigaciones = todas.filter(i => {
    if (filtro && i.tipo !== filtro) return false
    if (benchmarkFilter) {
      const slugsForBenchmark = BENCHMARK_ALL_ARTICLES[benchmarkFilter] ?? []
      if (!slugsForBenchmark.includes(i.slug)) return false
    }
    if (query) {
      return (
        i.titulo.toLowerCase().includes(query) ||
        i.resumen.toLowerCase().includes(query) ||
        i.tags?.some(t => t.toLowerCase().includes(query))
      )
    }
    return true
  })

  const buildUrl = (params: Record<string, string | undefined>) => {
    const p = new URLSearchParams()
    if (params.tipo) p.set('tipo', params.tipo)
    if (params.q) p.set('q', params.q)
    if (params.benchmark) p.set('benchmark', params.benchmark)
    const qs = p.toString()
    return `/investigaciones${qs ? `?${qs}` : ''}`
  }

  return (
    <main className="max-w-7xl mx-auto px-4 py-16">
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">Investigaciones del Observatorio</h1>
        <p className="text-gray-500 text-lg max-w-2xl">
          Análisis, reportes y perspectivas sobre la IA, el empleo y la educación superior en México.
        </p>
      </div>

      {/* Búsqueda */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <form method="get" action="/investigaciones" className="flex-1">
          {filtro && <input type="hidden" name="tipo" value={filtro} />}
          {benchmarkFilter && <input type="hidden" name="benchmark" value={benchmarkFilter} />}
          <div className="relative">
            <input
              type="text"
              name="q"
              defaultValue={searchParams.q ?? ''}
              placeholder="Buscar por tema, carrera, habilidad…"
              className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6] bg-white"
            />
            <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#1D4ED8]">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M16.65 16.65A7.5 7.5 0 1 0 3 9.5a7.5 7.5 0 0 0 13.65 7.15z" />
              </svg>
            </button>
          </div>
        </form>
      </div>

      {/* Filtros por tipo */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Link
          href={buildUrl({ q: searchParams.q, benchmark: benchmarkFilter || undefined })}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${!filtro ? 'bg-[#1D4ED8] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Todos
        </Link>
        {TIPOS.map(tipo => (
          <Link
            key={tipo}
            href={buildUrl({ tipo, q: searchParams.q, benchmark: benchmarkFilter || undefined })}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filtro === tipo ? 'bg-[#1D4ED8] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {getTipoLabel(tipo)}
          </Link>
        ))}
      </div>

      {/* Filtro por carrera benchmark */}
      <div className="mb-8">
        <p className="text-xs text-gray-400 uppercase tracking-widest mb-3">Por carrera</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(BENCHMARK_LABELS).map(([slug, label]) => (
            <Link
              key={slug}
              href={buildUrl({ tipo: filtro, q: searchParams.q, benchmark: benchmarkFilter === slug ? undefined : slug })}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                benchmarkFilter === slug
                  ? 'bg-[#1D4ED8] border-[#1D4ED8] text-white'
                  : 'border-gray-200 text-gray-600 hover:border-[#3B82F6] hover:text-[#1D4ED8] hover:bg-blue-50'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* Tag cloud — solo cuando no hay búsqueda activa */}
      {!query && !filtro && !benchmarkFilter && topTags.length > 0 && (
        <div className="mb-8">
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-3">Temas frecuentes</p>
          <div className="flex flex-wrap gap-2">
            {topTags.map(({ tag, count }) => (
              <Link
                key={tag}
                href={buildUrl({ q: tag })}
                className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:border-[#3B82F6] hover:text-[#1D4ED8] hover:bg-blue-50 transition-colors"
              >
                {tag}
                <span className="ml-1.5 text-gray-400 text-[10px]">{count}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {(query || benchmarkFilter) && (
        <p className="text-sm text-gray-500 mb-6">
          {investigaciones.length} resultado{investigaciones.length !== 1 ? 's' : ''}
          {query && <> para <strong className="text-gray-700">"{searchParams.q}"</strong></>}
          {benchmarkFilter && <> · carrera: <strong className="text-gray-700">{BENCHMARK_LABELS[benchmarkFilter] ?? benchmarkFilter}</strong></>}
          {' '}
          <Link href={buildUrl({ tipo: searchParams.tipo })} className="text-[#1D4ED8] hover:underline ml-1">
            Limpiar filtros
          </Link>
        </p>
      )}

      {/* Featured: carta a rectores (solo cuando no hay filtros activos) */}
      {!query && !filtro && !benchmarkFilter && (() => {
        const carta = investigaciones.find(i => i.slug === '2026-05-carta-rectores-urgencia-curricular')
        if (!carta) return null
        return (
          <Link href={`/investigaciones/${carta.slug}`} className="block mb-8">
            <article className="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-6 hover:border-indigo-400 hover:shadow-md transition-all">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="text-xs font-bold px-2 py-1 rounded-full bg-indigo-200 text-indigo-900 uppercase tracking-wide">
                  Destacado · Rectores
                </span>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${TIPO_COLOR[carta.tipo]}`}>
                  {getTipoLabel(carta.tipo)}
                </span>
              </div>
              <h2 className="font-bold text-indigo-900 text-xl leading-snug mb-2">{carta.titulo}</h2>
              <p className="text-indigo-700 text-sm leading-relaxed mb-3">{carta.resumen}</p>
              <span className="text-xs text-indigo-500">{carta.tiempo_lectura} de lectura →</span>
            </article>
          </Link>
        )
      })()}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {investigaciones.filter(i => i.slug !== '2026-05-carta-rectores-urgencia-curricular' || query || filtro || benchmarkFilter).map(inv => {
          const bmSlug = ARTICLE_TO_BENCHMARK[inv.slug]
          const bmLabel = bmSlug ? BENCHMARK_LABELS[bmSlug] : undefined
          return (
            <Link key={inv.slug} href={`/investigaciones/${inv.slug}`}>
              <article className="bg-white rounded-xl border border-gray-100 p-6 hover:border-[#3B82F6] hover:shadow-md transition-all h-full flex flex-col">
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${TIPO_COLOR[inv.tipo]}`}>
                    {getTipoLabel(inv.tipo)}
                  </span>
                  {bmLabel && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                      {bmLabel}
                    </span>
                  )}
                  {inv.acceso === 'lead_magnet' && (
                    <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-full">PDF</span>
                  )}
                </div>
                <h2 className="font-bold text-gray-900 text-lg leading-snug mb-2 flex-grow">{inv.titulo}</h2>
                <p className="text-gray-500 text-sm leading-relaxed line-clamp-2 mb-4">{inv.resumen}</p>
                <div className="flex items-center justify-between text-xs text-gray-400 mt-auto">
                  <span>{new Date(inv.fecha).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}</span>
                  <span>{inv.tiempo_lectura} de lectura</span>
                </div>
              </article>
            </Link>
          )
        })}
      </div>

      {investigaciones.length === 0 && (
        <div className="text-center py-16">
          <p className="text-gray-400 mb-2">No hay investigaciones{query ? ` sobre "${searchParams.q}"` : benchmarkFilter ? ` para esta carrera` : ' en esta categoría'} aún.</p>
          {(query || filtro || benchmarkFilter) && (
            <Link href="/investigaciones" className="text-[#1D4ED8] text-sm hover:underline">
              Ver todas las investigaciones
            </Link>
          )}
        </div>
      )}
    </main>
  )
}

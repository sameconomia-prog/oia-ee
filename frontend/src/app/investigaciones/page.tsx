import { getAllInvestigaciones, getTipoLabel, getTopTags } from '@/lib/investigaciones'
import type { TipoInvestigacion } from '@/lib/investigaciones'
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
  searchParams: { tipo?: string; q?: string }
}) {
  const todas = getAllInvestigaciones()
  const topTags = getTopTags(18)
  const filtro = searchParams.tipo as TipoInvestigacion | undefined
  const query = searchParams.q?.toLowerCase().trim() ?? ''

  const investigaciones = todas.filter(i => {
    if (filtro && i.tipo !== filtro) return false
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

      {/* Búsqueda y filtros */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <form method="get" action="/investigaciones" className="flex-1">
          {filtro && <input type="hidden" name="tipo" value={filtro} />}
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
      <div className="flex flex-wrap gap-2 mb-10">
        <Link
          href={buildUrl({ q: searchParams.q })}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${!filtro ? 'bg-[#1D4ED8] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Todos
        </Link>
        {TIPOS.map(tipo => (
          <Link
            key={tipo}
            href={buildUrl({ tipo, q: searchParams.q })}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filtro === tipo ? 'bg-[#1D4ED8] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {getTipoLabel(tipo)}
          </Link>
        ))}
      </div>

      {/* Tag cloud — only when no active search/filter */}
      {!query && !filtro && topTags.length > 0 && (
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

      {query && (
        <p className="text-sm text-gray-500 mb-6">
          {investigaciones.length} resultado{investigaciones.length !== 1 ? 's' : ''} para{' '}
          <strong className="text-gray-700">"{searchParams.q}"</strong>{' '}
          <Link href={buildUrl({ tipo: searchParams.tipo })} className="text-[#1D4ED8] hover:underline ml-1">
            Limpiar búsqueda
          </Link>
        </p>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {investigaciones.map(inv => (
          <Link key={inv.slug} href={`/investigaciones/${inv.slug}`}>
            <article className="bg-white rounded-xl border border-gray-100 p-6 hover:border-[#3B82F6] hover:shadow-md transition-all h-full flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${TIPO_COLOR[inv.tipo]}`}>
                  {getTipoLabel(inv.tipo)}
                </span>
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
        ))}
      </div>

      {investigaciones.length === 0 && (
        <div className="text-center py-16">
          <p className="text-gray-400 mb-2">No hay investigaciones{query ? ` sobre "${searchParams.q}"` : ' en esta categoría'} aún.</p>
          {(query || filtro) && (
            <Link href="/investigaciones" className="text-[#1D4ED8] text-sm hover:underline">
              Ver todas las investigaciones
            </Link>
          )}
        </div>
      )}
    </main>
  )
}

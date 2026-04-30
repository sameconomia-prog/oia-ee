import { getAllInvestigaciones, getTipoLabel } from '@/lib/investigaciones'
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
  searchParams: { tipo?: string }
}) {
  const todas = getAllInvestigaciones()
  const filtro = searchParams.tipo as TipoInvestigacion | undefined
  const investigaciones = filtro ? todas.filter(i => i.tipo === filtro) : todas

  return (
    <main className="max-w-7xl mx-auto px-4 py-16">
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">Investigaciones del Observatorio</h1>
        <p className="text-gray-500 text-lg max-w-2xl">
          Análisis, reportes y perspectivas sobre la IA, el empleo y la educación superior en México.
        </p>
      </div>

      {/* Filtros por tipo */}
      <div className="flex flex-wrap gap-2 mb-10">
        <Link
          href="/investigaciones"
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${!filtro ? 'bg-[#1D4ED8] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Todos
        </Link>
        {TIPOS.map(tipo => (
          <Link
            key={tipo}
            href={`/investigaciones?tipo=${tipo}`}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filtro === tipo ? 'bg-[#1D4ED8] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {getTipoLabel(tipo)}
          </Link>
        ))}
      </div>

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
        <p className="text-center text-gray-400 py-16">No hay investigaciones en esta categoría aún.</p>
      )}
    </main>
  )
}

import Link from 'next/link'
import type { Investigacion } from '@/lib/investigaciones'
import { getTipoLabel } from '@/lib/investigaciones'

interface InvestigacionesGridProps {
  investigaciones: Investigacion[]
}

const TIPO_COLOR: Record<string, string> = {
  reporte: 'bg-blue-100 text-blue-800',
  analisis: 'bg-purple-100 text-purple-800',
  carta: 'bg-green-100 text-green-800',
  nota: 'bg-yellow-100 text-yellow-800',
  metodologia: 'bg-gray-100 text-gray-800',
}

export default function InvestigacionesGrid({ investigaciones }: InvestigacionesGridProps) {
  const items = investigaciones.slice(0, 4)
  return (
    <section className="py-20 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-12">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Investigaciones del Observatorio</h2>
            <p className="text-gray-500 mt-2">Análisis, reportes y perspectivas sobre IA, empleo y educación.</p>
          </div>
          <Link href="/investigaciones" className="text-[#1D4ED8] font-medium text-sm hover:underline hidden md:block">
            Ver todas las investigaciones →
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {items.map((inv) => (
            <Link key={inv.slug} href={`/investigaciones/${inv.slug}`}>
              <article className="bg-[#F8FAFC] rounded-xl p-6 border border-gray-100 hover:border-[#3B82F6] hover:shadow-md transition-all h-full">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${TIPO_COLOR[inv.tipo] ?? 'bg-gray-100 text-gray-800'}`}>
                    {getTipoLabel(inv.tipo)}
                  </span>
                  <span className="text-xs text-gray-400">{inv.tiempo_lectura} de lectura</span>
                </div>
                <h3 className="font-bold text-gray-900 text-lg leading-snug mb-2">{inv.titulo}</h3>
                <p className="text-gray-500 text-sm leading-relaxed line-clamp-3">{inv.resumen}</p>
                <p className="text-[#1D4ED8] text-sm font-medium mt-4">Leer →</p>
              </article>
            </Link>
          ))}
        </div>
        <div className="text-center mt-8 md:hidden">
          <Link href="/investigaciones" className="text-[#1D4ED8] font-semibold">
            Ver todas las investigaciones →
          </Link>
        </div>
      </div>
    </section>
  )
}

import Link from 'next/link'
import type { BenchmarkSource } from '@/lib/types'

const TIPO_LABEL: Record<string, string> = {
  prediccion:  'Predicción',
  observacion: 'Observación real',
  regional:    'Regional/ALC',
}
const TIPO_COLOR: Record<string, string> = {
  prediccion:  'bg-purple-100 text-purple-800',
  observacion: 'bg-green-100 text-green-800',
  regional:    'bg-amber-100 text-amber-800',
}
const MET_LABEL: Record<string, string> = {
  encuesta_empleadores: 'Encuesta empleadores',
  analisis_tareas:      'Análisis de tareas',
  uso_observado:        'Uso observado en IA',
  modelado_economico:   'Modelado econométrico',
  revision_literatura:  'Revisión literatura + ML',
}
const ACCENT = ['#6366F1', '#8B5CF6', '#0EA5E9', '#10B981', '#F59E0B']

export default function SourceCards({ sources }: { sources: BenchmarkSource[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {sources.map((source, i) => (
        <div
          key={source.id}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-col"
          style={{ borderTop: `3px solid ${ACCENT[i % ACCENT.length]}` }}
        >
          <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-2">
            {source.nombre}
          </h3>
          <div className="flex flex-wrap gap-1 mb-3">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIPO_COLOR[source.tipo_evidencia] ?? 'bg-gray-100 text-gray-600'}`}>
              {TIPO_LABEL[source.tipo_evidencia] ?? source.tipo_evidencia}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
              {source.año}
            </span>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            {MET_LABEL[source.metodologia] ?? source.metodologia}
          </p>
          <p className="text-sm font-medium text-gray-800 leading-snug flex-1">
            {source.dato_clave}
          </p>
          <div className="mt-3 flex items-center justify-between gap-2">
            <Link
              href={`/benchmarks/fuentes/${source.id}`}
              className="text-xs text-brand-600 hover:underline font-medium"
            >
              Ver hallazgos →
            </Link>
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-400 hover:underline"
            >
              Reporte ↗
            </a>
          </div>
        </div>
      ))}
    </div>
  )
}

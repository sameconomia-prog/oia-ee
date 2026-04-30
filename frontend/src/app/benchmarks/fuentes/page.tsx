// frontend/src/app/benchmarks/fuentes/page.tsx
'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getBenchmarkSources } from '@/lib/api'
import type { BenchmarkSource } from '@/lib/types'
import SectionHeader from '@/components/ui/SectionHeader'

const MET_LABEL: Record<string, string> = {
  encuesta_empleadores: 'Encuesta empleadores',
  analisis_tareas: 'Análisis de tareas',
  uso_observado: 'Uso observado en IA',
  modelado_economico: 'Modelado econométrico',
  revision_literatura: 'Revisión literatura + ML',
}

const TIPO_LABEL: Record<string, string> = {
  prediccion: 'Predicción',
  observacion: 'Observación real',
  regional: 'Regional/ALC',
}

const TIPO_COLOR: Record<string, string> = {
  prediccion: 'bg-purple-100 text-purple-800',
  observacion: 'bg-emerald-100 text-emerald-800',
  regional: 'bg-amber-100 text-amber-800',
}

const ACCENT = ['#6366F1', '#8B5CF6', '#0EA5E9', '#10B981', '#F59E0B']

const CONFIANZA_COLOR: Record<string, string> = {
  alta: 'text-emerald-700',
  media: 'text-amber-600',
  baja: 'text-red-600',
}

export default function FuentesIndexPage() {
  const [sources, setSources] = useState<BenchmarkSource[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getBenchmarkSources().then(setSources).finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-slate-400 text-sm py-8 text-center">Cargando fuentes...</p>

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-5">
        <Link href="/benchmarks" className="text-xs text-brand-600 hover:underline">← Benchmarks Globales</Link>
        <div className="mt-2">
          <SectionHeader
            title="Fuentes de Benchmark"
            subtitle={`${sources.length} reportes internacionales sobre el impacto de la IA en habilidades profesionales`}
          />
        </div>
      </div>

      <div className="space-y-4">
        {sources.map((source, i) => (
          <div
            key={source.id}
            className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm"
            style={{ borderLeft: `4px solid ${ACCENT[i % ACCENT.length]}` }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h2 className="text-sm font-bold text-slate-900">{source.nombre}</h2>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${TIPO_COLOR[source.tipo_evidencia] ?? 'bg-slate-100 text-slate-600'}`}>
                    {TIPO_LABEL[source.tipo_evidencia] ?? source.tipo_evidencia}
                  </span>
                  <span className="text-[10px] text-slate-400">{source.año}</span>
                </div>
                <p className="text-xs text-slate-500 mb-2">{MET_LABEL[source.metodologia] ?? source.metodologia}</p>
                <p className="text-sm text-slate-700 leading-relaxed mb-3">{source.dato_clave}</p>
                <div className="flex items-center gap-4 text-[11px] text-slate-400">
                  <span>Confianza: <span className={`font-semibold capitalize ${CONFIANZA_COLOR[source.confianza] ?? ''}`}>{source.confianza}</span></span>
                  <span>Cobertura: <span className="font-semibold text-slate-600 capitalize">{source.peso_geografico}</span></span>
                </div>
              </div>
              <div className="flex flex-col gap-2 shrink-0 items-end">
                <Link
                  href={`/benchmarks/fuentes/${source.id}`}
                  className="text-xs text-brand-600 border border-brand-200 px-3 py-1.5 rounded hover:bg-brand-50 transition-colors font-medium whitespace-nowrap"
                >
                  Ver hallazgos →
                </Link>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-slate-400 hover:underline"
                >
                  Reporte original ↗
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

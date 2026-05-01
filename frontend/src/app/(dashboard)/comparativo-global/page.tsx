'use client'
import { useEffect, useState } from 'react'
import type { BenchmarkSource, BenchmarkCareerSummary } from '@/lib/types'
import { getBenchmarkSources, getBenchmarkCareers } from '@/lib/api'
import SourceCards from '@/components/benchmarks/SourceCards'
import CareerExplorer from '@/components/benchmarks/CareerExplorer'
import MethodologyNote from '@/components/benchmarks/MethodologyNote'

export default function ComparativoGlobalPage() {
  const [sources, setSources] = useState<BenchmarkSource[]>([])
  const [careers, setCareers] = useState<BenchmarkCareerSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getBenchmarkSources(), getBenchmarkCareers()])
      .then(([s, c]) => {
        setSources(s)
        setCareers(c)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <p className="text-gray-500 text-sm">Cargando benchmarks globales...</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-12">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-slate-900">
          Comparativo Global
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          ¿El mundo coincide con lo que OIA-EE mide sobre carreras universitarias mexicanas?
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {sources.map((s) => (
            <span
              key={s.id}
              className="px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800"
            >
              {s.nombre.split('—')[0].trim()}
            </span>
          ))}
        </div>
      </div>

      <MethodologyNote />

      <section>
        <h2 className="text-xl font-semibold text-slate-800 mb-4">Las fuentes</h2>
        <SourceCards sources={sources} />
      </section>

      <section>
        <h2 className="text-xl font-semibold text-slate-800 mb-2">
          Explorador por carrera
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          Elige una carrera para ver qué dicen las 5 fuentes sobre cada habilidad de su plan de estudios.
        </p>
        {careers.length > 0 && sources.length > 0 && (
          <CareerExplorer careers={careers} sources={sources} />
        )}
      </section>

      <section className="text-center py-10 bg-white border border-slate-200 rounded-xl">
        <h2 className="text-xl font-semibold text-slate-900 mb-2">
          ¿Quieres el análisis completo con datos del mercado laboral mexicano?
        </h2>
        <p className="text-slate-600 mb-5 text-sm">
          OIA-EE cruza estos benchmarks globales con vacantes reales de OCC México
          para darte un panorama local + global de cada carrera.
        </p>
        <a
          href="/carreras"
          className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Ver análisis completo de carreras →
        </a>
      </section>
    </div>
  )
}

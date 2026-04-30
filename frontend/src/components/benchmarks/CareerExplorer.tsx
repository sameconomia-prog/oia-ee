'use client'
import { useState, useEffect } from 'react'
import type { BenchmarkCareerSummary, BenchmarkCareerDetail, BenchmarkSource } from '@/lib/types'
import { getBenchmarkCareerDetail } from '@/lib/api'
import SkillConvergenceTable from './SkillConvergenceTable'

export default function CareerExplorer({
  careers,
  sources,
}: {
  careers: BenchmarkCareerSummary[]
  sources: BenchmarkSource[]
}) {
  const [selectedSlug, setSelectedSlug] = useState<string>(careers[0]?.slug ?? '')
  const [detail, setDetail] = useState<BenchmarkCareerDetail | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!selectedSlug) return
    setLoading(true)
    getBenchmarkCareerDetail(selectedSlug)
      .then(setDetail)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [selectedSlug])

  const selected = careers.find((c) => c.slug === selectedSlug)

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-6">
        {careers.map((c) => (
          <button
            key={c.slug}
            onClick={() => setSelectedSlug(c.slug)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              c.slug === selectedSlug
                ? 'bg-blue-700 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {c.nombre}
          </button>
        ))}
      </div>

      {selected && (
        <div className="flex flex-wrap gap-4 text-sm mb-4 px-1">
          <span className="text-gray-600">
            <strong className="text-red-600">{selected.skills_declining}</strong>{' '}
            en declive
          </span>
          <span className="text-gray-600">
            <strong className="text-green-600">{selected.skills_growing}</strong>{' '}
            en crecimiento
          </span>
          <span className="text-gray-600">
            <strong className="text-amber-600">{selected.skills_mixed}</strong>{' '}
            mixtas
          </span>
          <span className="text-gray-600">
            <strong className="text-gray-400">{selected.skills_sin_datos}</strong>{' '}
            sin datos globales
          </span>
        </div>
      )}

      {loading && (
        <p className="text-gray-500 text-sm py-8 text-center">Cargando...</p>
      )}
      {!loading && detail && (
        <SkillConvergenceTable skills={detail.skills} sources={sources} />
      )}
    </div>
  )
}

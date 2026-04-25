'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { getCarrerasDeIes, getIesPublico } from '@/lib/api'
import type { CarreraKpi, IesInfo } from '@/lib/types'

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

export default function IesDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [ies, setIes] = useState<IesInfo | null>(null)
  const [carreras, setCarreras] = useState<CarreraKpi[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return
    Promise.all([
      getIesPublico(),
      getCarrerasDeIes(id),
    ])
      .then(([iesList, cs]) => {
        setIes(iesList.find(i => i.id === id) ?? null)
        setCarreras(cs)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return <p className="text-gray-400 text-sm py-8 text-center">Cargando...</p>
  }

  if (notFound || (!ies && carreras.length === 0)) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 text-sm mb-4">IES no encontrada.</p>
        <Link href="/" className="text-indigo-600 text-sm hover:underline">← Volver al inicio</Link>
      </div>
    )
  }

  const nombre = ies?.nombre ?? id

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Link href="/" className="text-xs text-indigo-600 hover:underline">← Inicio</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">{nombre}</h1>
        {ies?.nombre_corto && (
          <p className="text-sm text-gray-500">{ies.nombre_corto}</p>
        )}
      </div>

      <div className="bg-white rounded-xl border shadow-sm">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-800 text-sm">
            Carreras ({carreras.length})
          </h2>
        </div>

        {carreras.length === 0 && (
          <p className="text-gray-400 text-sm px-5 py-8 text-center">Sin carreras registradas.</p>
        )}

        {carreras.map(c => (
          <div key={c.id} className="px-5 py-4 border-b last:border-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 mb-1">{c.nombre}</p>
                {c.matricula != null && (
                  <p className="text-xs text-gray-400">Matrícula: {c.matricula.toLocaleString()}</p>
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
        ))}
      </div>
    </div>
  )
}

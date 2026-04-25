'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { getIesDetalle, getCarrerasDeIes } from '@/lib/api'
import type { IesDetalle, CarreraKpi } from '@/lib/types'

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
  const [detalle, setDetalle] = useState<IesDetalle | null>(null)
  const [carreras, setCarreras] = useState<CarreraKpi[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return
    Promise.all([
      getIesDetalle(id),
      getCarrerasDeIes(id),
    ])
      .then(([det, cs]) => {
        setDetalle(det)
        setCarreras(cs)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

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
        <h1 className="text-2xl font-bold text-gray-900 mt-2">{detalle.nombre}</h1>
        {detalle.nombre_corto && (
          <p className="text-sm text-gray-500">{detalle.nombre_corto}</p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
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
      </div>

      {/* Carreras */}
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
                <Link href={`/carreras/${c.id}`} className="text-sm font-medium text-gray-800 hover:text-indigo-700 hover:underline">
                  {c.nombre}
                </Link>
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

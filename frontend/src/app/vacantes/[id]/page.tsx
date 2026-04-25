'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { getVacanteDetalle } from '@/lib/api'
import type { VacantePublico } from '@/lib/types'

export default function VacanteDetallePage() {
  const { id } = useParams<{ id: string }>()
  const [vacante, setVacante] = useState<VacantePublico | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return
    getVacanteDetalle(id)
      .then(setVacante)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <p className="text-gray-400 text-sm py-8 text-center">Cargando...</p>

  if (notFound || !vacante) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 text-sm mb-4">Vacante no encontrada.</p>
        <Link href="/vacantes" className="text-indigo-600 text-sm hover:underline">← Ver vacantes</Link>
      </div>
    )
  }

  const v = vacante

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/vacantes" className="text-xs text-indigo-600 hover:underline">← Vacantes</Link>
        <div className="flex items-start gap-2 mt-3 flex-wrap">
          {v.sector && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-medium">{v.sector}</span>
          )}
          {v.estado && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{v.estado}</span>
          )}
        </div>
        <h1 className="text-xl font-bold text-gray-900 mt-2 leading-tight">{v.titulo}</h1>
        {v.empresa && <p className="text-sm text-gray-600 mt-0.5">{v.empresa}</p>}
        {v.fecha_pub && (
          <p className="text-xs text-gray-400 mt-1">{new Date(v.fecha_pub).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
        )}
      </div>

      <div className="bg-white rounded-xl border shadow-sm p-5 mb-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Detalles</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {v.nivel_educativo && (
            <div>
              <p className="text-xs text-gray-400">Nivel educativo</p>
              <p className="font-medium text-gray-700">{v.nivel_educativo}</p>
            </div>
          )}
          {v.experiencia_anios != null && (
            <div>
              <p className="text-xs text-gray-400">Experiencia</p>
              <p className="font-medium text-gray-700">{v.experiencia_anios} {v.experiencia_anios === 1 ? 'año' : 'años'}</p>
            </div>
          )}
          {(v.salario_min != null || v.salario_max != null) && (
            <div className="col-span-2">
              <p className="text-xs text-gray-400">Salario mensual</p>
              <p className="font-medium text-gray-700">
                {v.salario_min != null ? `$${v.salario_min.toLocaleString()}` : '—'}
                {v.salario_max != null ? ` – $${v.salario_max.toLocaleString()}` : ''}
              </p>
            </div>
          )}
        </div>
      </div>

      {v.skills.length > 0 && (
        <div className="bg-white rounded-xl border shadow-sm p-5">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Skills requeridas</h2>
          <div className="flex flex-wrap gap-2">
            {v.skills.map(s => (
              <span key={s} className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium">{s}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

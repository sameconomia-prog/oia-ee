'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getEstadisticasPublicas } from '@/lib/api'
import type { EstadisticasPublicas } from '@/lib/types'

function StatBox({ label, value, color, href }: { label: string; value: number | string; color: string; href?: string }) {
  const inner = (
    <div className={`rounded-xl border p-5 bg-white shadow-sm ${href ? 'hover:shadow-md transition-shadow' : ''}`}>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-4xl font-bold font-mono ${color}`}>{value}</p>
    </div>
  )
  return href ? <Link href={href}>{inner}</Link> : inner
}

export default function EstadisticasPage() {
  const [data, setData] = useState<EstadisticasPublicas | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getEstadisticasPublicas()
      .then(setData)
      .catch((e: Error) => setError(e.message))
  }, [])

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Link href="/" className="text-xs text-indigo-600 hover:underline">← Inicio</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Estadísticas del Observatorio</h1>
        <p className="text-sm text-gray-500 mt-1">Resumen consolidado de datos monitoreados en tiempo real</p>
      </div>

      {error && <p className="text-red-500 text-sm mb-4">Error cargando datos: {error}</p>}
      {!data && !error && <p className="text-gray-400 text-sm py-8 text-center">Cargando...</p>}

      {data && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
            <StatBox label="Instituciones" value={data.total_ies} color="text-indigo-600" href="/ies" />
            <StatBox label="Carreras" value={data.total_carreras} color="text-indigo-600" href="/carreras" />
            <StatBox label="Vacantes IA" value={data.total_vacantes} color="text-blue-600" href="/vacantes" />
            <StatBox label="Noticias analizadas" value={data.total_noticias} color="text-gray-800" href="/noticias" />
            <StatBox
              label="Alertas activas"
              value={data.alertas_activas}
              color={data.alertas_activas > 0 ? 'text-red-500' : 'text-gray-400'}
            />
          </div>

          {data.top_skills.length > 0 && (
            <div className="bg-white rounded-xl border shadow-sm p-5 mb-6">
              <h2 className="font-semibold text-gray-800 text-sm mb-3">Top skills en vacantes IA</h2>
              <div className="flex flex-wrap gap-2">
                {data.top_skills.map(s => (
                  <span key={s} className="px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-sm font-medium">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {[
              { href: '/kpis', label: 'Ver rankings KPI' },
              { href: '/comparar', label: 'Comparar instituciones' },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center justify-center p-4 bg-white rounded-xl border shadow-sm hover:shadow-md hover:border-indigo-300 transition-all text-sm font-medium text-gray-700"
              >
                {label} →
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

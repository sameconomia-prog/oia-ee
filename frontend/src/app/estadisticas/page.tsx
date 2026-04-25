'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getEstadisticasPublicas, getKpisDistribucion } from '@/lib/api'
import type { EstadisticasPublicas, KpisDistribucion } from '@/lib/types'

function StatBox({ label, value, color, href }: { label: string; value: number | string; color: string; href?: string }) {
  const inner = (
    <div className={`rounded-xl border p-5 bg-white shadow-sm ${href ? 'hover:shadow-md transition-shadow' : ''}`}>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-4xl font-bold font-mono ${color}`}>{value}</p>
    </div>
  )
  return href ? <Link href={href}>{inner}</Link> : inner
}

function DistribucionBar({ bins, colorFn }: {
  bins: KpisDistribucion['d1']
  colorFn: (rango: string) => string
}) {
  const total = bins.reduce((s, b) => s + b.count, 0)
  if (total === 0) return <p className="text-xs text-gray-400">Sin datos</p>
  return (
    <div className="space-y-2">
      {bins.map(b => (
        <div key={b.rango} className="flex items-center gap-3">
          <span className="text-xs text-gray-500 w-32 shrink-0">{b.rango}</span>
          <div className="flex-1 bg-gray-100 rounded-full h-3">
            <div
              className={`h-3 rounded-full ${colorFn(b.rango)}`}
              style={{ width: `${total > 0 ? (b.count / total) * 100 : 0}%` }}
            />
          </div>
          <span className="text-xs font-mono text-gray-600 w-8 text-right">{b.count}</span>
        </div>
      ))}
    </div>
  )
}

export default function EstadisticasPage() {
  const [data, setData] = useState<EstadisticasPublicas | null>(null)
  const [distribucion, setDistribucion] = useState<KpisDistribucion | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getEstadisticasPublicas()
      .then(setData)
      .catch((e: Error) => setError(e.message))
    getKpisDistribucion()
      .then(setDistribucion)
      .catch(() => {})
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

          {distribucion && (
            <div className="bg-white rounded-xl border shadow-sm p-5 mb-6">
              <h2 className="font-semibold text-gray-800 text-sm mb-4">Distribución de riesgo nacional</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">D1 Obsolescencia (riesgo por IA)</p>
                  <DistribucionBar
                    bins={distribucion.d1}
                    colorFn={r => r.startsWith('Alto') ? 'bg-red-400' : r.startsWith('Medio') ? 'bg-yellow-400' : 'bg-green-400'}
                  />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">D2 Oportunidades curriculares</p>
                  <DistribucionBar
                    bins={distribucion.d2}
                    colorFn={r => r.startsWith('Alto') ? 'bg-green-400' : r.startsWith('Medio') ? 'bg-yellow-400' : 'bg-red-400'}
                  />
                </div>
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

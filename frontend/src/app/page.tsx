'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getResumenPublico } from '@/lib/api'
import type { ResumenPublico } from '@/lib/types'

function StatCard({ label, value, sub, color }: {
  label: string
  value: number | string
  sub?: string
  color: string
}) {
  return (
    <div className={`rounded-xl border p-5 bg-white shadow-sm`}>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

const IMPACTO_COLOR: Record<string, string> = {
  riesgo: 'text-red-600',
  oportunidad: 'text-green-600',
  neutro: 'text-yellow-600',
}

export default function HomePage() {
  const [data, setData] = useState<ResumenPublico | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getResumenPublico()
      .then(setData)
      .catch((e: Error) => setError(e.message))
  }, [])

  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero */}
      <div className="mb-8">
        <div className="inline-block px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium mb-3">
          Plataforma de análisis · México
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Observatorio de Indicadores<br />
          <span className="text-indigo-600">IA · Empleo · Educación</span>
        </h1>
        <p className="text-gray-500 text-sm max-w-xl">
          Monitoreo en tiempo real de tendencias de automatización, riesgo laboral y
          oportunidades de actualización curricular para instituciones de educación superior en México.
        </p>
        <div className="flex gap-3 mt-4">
          <Link
            href="/rector"
            className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Acceso rectores →
          </Link>
          <Link
            href="/noticias"
            className="px-4 py-2 border text-sm rounded-lg hover:bg-gray-50 transition-colors"
          >
            Ver noticias
          </Link>
        </div>
      </div>

      {/* Stats */}
      {error && (
        <p className="text-red-500 text-sm mb-4">Error cargando datos: {error}</p>
      )}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard
          label="IES monitoreadas"
          value={data?.total_ies ?? '—'}
          sub="Instituciones activas"
          color="text-indigo-600"
        />
        <StatCard
          label="Noticias analizadas"
          value={data?.total_noticias ?? '—'}
          sub="Con clasificación IA"
          color="text-gray-800"
        />
        <StatCard
          label="Alertas activas"
          value={data?.alertas_activas ?? '—'}
          sub="Sin leer por rectores"
          color={data && data.alertas_activas > 0 ? 'text-red-500' : 'text-gray-800'}
        />
      </div>

      {/* Noticias recientes */}
      <div className="bg-white rounded-xl border shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold text-gray-800 text-sm">Noticias recientes</h2>
          <Link href="/noticias" className="text-xs text-indigo-600 hover:underline">
            Ver todas →
          </Link>
        </div>
        {!data && !error && (
          <p className="px-5 py-8 text-center text-gray-400 text-sm">Cargando...</p>
        )}
        {data && data.noticias_recientes.length === 0 && (
          <p className="px-5 py-8 text-center text-gray-400 text-sm">Sin noticias aún.</p>
        )}
        {data && data.noticias_recientes.map((n) => (
          <div key={n.id} className="flex items-start gap-3 px-5 py-3 border-b last:border-0 hover:bg-gray-50">
            <div className="flex-1 min-w-0">
              <a
                href={n.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-gray-800 hover:underline line-clamp-1"
              >
                {n.titulo}
              </a>
              <p className="text-xs text-gray-400 mt-0.5">
                {n.fuente} · {n.sector ?? 'sin sector'} · {formatDate(n.fecha_pub)}
              </p>
            </div>
            {n.tipo_impacto && (
              <span className={`text-xs font-medium shrink-0 ${IMPACTO_COLOR[n.tipo_impacto] ?? 'text-gray-500'}`}>
                {n.tipo_impacto}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <p className="text-center text-xs text-gray-400 mt-8">
        OIA-EE · Datos procesados con IA · Actualización diaria
      </p>
    </div>
  )
}

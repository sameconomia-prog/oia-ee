'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { getNoticiaDetalle } from '@/lib/api'
import type { Noticia } from '@/lib/types'

const IMPACTO_COLOR: Record<string, string> = {
  riesgo: 'bg-red-100 text-red-800',
  oportunidad: 'bg-green-100 text-green-800',
  neutro: 'bg-yellow-100 text-yellow-800',
}

function formatDate(d: string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })
}

export default function NoticiaDetallePage() {
  const { id } = useParams<{ id: string }>()
  const [noticia, setNoticia] = useState<Noticia | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return
    getNoticiaDetalle(id)
      .then(setNoticia)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <p className="text-gray-400 text-sm py-8 text-center">Cargando...</p>

  if (notFound || !noticia) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 text-sm mb-4">Noticia no encontrada.</p>
        <Link href="/noticias" className="text-indigo-600 text-sm hover:underline">← Ver noticias</Link>
      </div>
    )
  }

  const n = noticia

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/noticias" className="text-xs text-indigo-600 hover:underline">← Noticias</Link>
        <div className="flex items-start gap-2 mt-3 flex-wrap">
          {n.tipo_impacto && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${IMPACTO_COLOR[n.tipo_impacto] ?? 'bg-gray-100 text-gray-600'}`}>
              {n.tipo_impacto}
            </span>
          )}
          {n.sector && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-medium">{n.sector}</span>
          )}
          {n.pais && (
            <span className="text-xs text-gray-500">{n.pais}</span>
          )}
        </div>
        <h1 className="text-xl font-bold text-gray-900 mt-2 leading-tight">{n.titulo}</h1>
        <p className="text-xs text-gray-400 mt-1">
          {n.fuente} · {formatDate(n.fecha_ingesta ?? n.fecha_pub)}
        </p>
      </div>

      <a
        href={n.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 mb-6 px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-lg text-sm text-indigo-700 hover:bg-indigo-100 transition-colors"
      >
        <span>🔗</span>
        <span className="flex-1 truncate">{n.url}</span>
        <span className="shrink-0 text-xs">Ver fuente →</span>
      </a>

      {n.resumen_claude && (
        <div className="bg-white border rounded-xl p-5 mb-4 shadow-sm">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Resumen IA</h2>
          <p className="text-sm text-gray-700 leading-relaxed">{n.resumen_claude}</p>
        </div>
      )}

      {n.causa_ia && (
        <div className="bg-white border rounded-xl p-5 mb-4 shadow-sm">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Causa IA</h2>
          <p className="text-sm text-gray-700 leading-relaxed">{n.causa_ia}</p>
        </div>
      )}

      {(n.empresa || n.n_empleados) && (
        <div className="bg-white border rounded-xl p-5 shadow-sm">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Datos del evento</h2>
          <div className="space-y-2 text-sm text-gray-700">
            {n.empresa && (
              <div className="flex gap-2">
                <span className="text-gray-400 w-20 shrink-0">Empresa</span>
                <span className="font-medium">{n.empresa}</span>
              </div>
            )}
            {n.n_empleados != null && (
              <div className="flex gap-2">
                <span className="text-gray-400 w-20 shrink-0">Empleados</span>
                <span className="font-medium">{n.n_empleados.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

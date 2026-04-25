'use client'
import { useEffect, useState } from 'react'
import { getNoticias } from '@/lib/api'
import type { Noticia } from '@/lib/types'

const IMPACTO: Record<string, string> = {
  riesgo: 'text-red-600 bg-red-50',
  oportunidad: 'text-green-600 bg-green-50',
  neutro: 'text-yellow-600 bg-yellow-50',
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function RectorNoticiasPanel() {
  const [noticias, setNoticias] = useState<Noticia[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getNoticias({ limit: 15 })
      .then(setNoticias)
      .catch(() => setNoticias([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-gray-400 text-sm py-6">Cargando noticias...</p>
  if (noticias.length === 0) return <p className="text-gray-400 text-sm py-6">Sin noticias disponibles.</p>

  return (
    <div className="space-y-2">
      {noticias.map(n => (
        <div key={n.id} className="border rounded-lg p-3 bg-white hover:bg-gray-50 transition-colors">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <a
                href={n.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-gray-900 hover:underline line-clamp-2"
              >
                {n.titulo}
              </a>
              <p className="text-xs text-gray-400 mt-0.5">
                {n.fuente} · {n.sector ?? 'sin sector'} · {formatDate(n.fecha_pub)}
              </p>
            </div>
            {n.tipo_impacto && (
              <span className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full ${IMPACTO[n.tipo_impacto] ?? 'text-gray-500 bg-gray-100'}`}>
                {n.tipo_impacto}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

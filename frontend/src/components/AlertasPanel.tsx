'use client'
import type { AlertaItem } from '@/lib/types'

const TIPO_LABELS: Record<string, string> = {
  d1_alto: 'D1 alto',
  d2_bajo: 'D2 bajo',
  ambos: 'D1 alto + D2 bajo',
}

export default function AlertasPanel({ alertas }: { alertas: AlertaItem[] }) {
  if (alertas.length === 0) {
    return (
      <div className="p-4 text-sm text-green-600 flex items-center gap-2">
        <span>✓</span>
        <span>Sin alertas activas</span>
      </div>
    )
  }
  const sorted = [...alertas].sort((a, b) =>
    a.severidad === 'alta' && b.severidad !== 'alta' ? -1 : 1
  )
  return (
    <div className="flex flex-col gap-2 p-3">
      <h3 className="text-xs font-semibold uppercase text-gray-500 tracking-wide mb-1">
        Alertas activas ({alertas.length})
      </h3>
      {sorted.map((a) => (
        <div
          key={a.id}
          className={`rounded border p-2.5 text-xs ${
            a.severidad === 'alta'
              ? 'bg-red-50 border-red-200'
              : 'bg-yellow-50 border-yellow-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-gray-800">{a.carrera_nombre}</span>
            <span
              className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                a.severidad === 'alta'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}
            >
              {a.severidad}
            </span>
          </div>
          <div className="text-gray-600">{TIPO_LABELS[a.tipo] ?? a.tipo}</div>
          {a.mensaje && <div className="text-gray-500 mt-1">{a.mensaje}</div>}
        </div>
      ))}
    </div>
  )
}

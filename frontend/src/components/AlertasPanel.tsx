'use client'
import { useState, useEffect } from 'react'
import type { AlertaItem, AlertaDB } from '@/lib/types'
import { getAlertas, markAlertaRead } from '@/lib/api'

const TIPO_LABELS: Record<string, string> = {
  d1_alto: 'D1 alto',
  d2_bajo: 'D2 bajo',
  ambos: 'D1 alto + D2 bajo',
}

export default function AlertasPanel({
  alertas,
  iesId,
}: {
  alertas: AlertaItem[]
  iesId: string
}) {
  const [tab, setTab] = useState<'actuales' | 'historial'>('actuales')
  const [historial, setHistorial] = useState<AlertaDB[]>([])
  const [histLoading, setHistLoading] = useState(false)

  useEffect(() => {
    if (tab !== 'historial') return
    setHistLoading(true)
    getAlertas(iesId)
      .then((data) => setHistorial(data.alertas))
      .catch(() => setHistorial([]))
      .finally(() => setHistLoading(false))
  }, [tab, iesId])

  const handleMarkRead = async (id: string) => {
    await markAlertaRead(id)
    setHistorial((prev) =>
      prev.map((a) => (a.id === id ? { ...a, leida: true } : a))
    )
  }

  const sorted = [...alertas].sort((a, b) =>
    a.severidad === 'alta' && b.severidad !== 'alta' ? -1 : 1
  )

  return (
    <div>
      <div className="flex border-b border-gray-200 text-xs font-medium">
        <button
          onClick={() => setTab('actuales')}
          className={`px-3 py-2 ${
            tab === 'actuales'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Actuales ({alertas.length})
        </button>
        <button
          onClick={() => setTab('historial')}
          className={`px-3 py-2 ${
            tab === 'historial'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Historial
        </button>
      </div>

      {tab === 'actuales' && (
        <div className="flex flex-col gap-2 p-3">
          {alertas.length === 0 ? (
            <div className="text-sm text-green-600 flex items-center gap-2">
              <span>✓</span>
              <span>Sin alertas activas</span>
            </div>
          ) : (
            sorted.map((a) => (
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
            ))
          )}
        </div>
      )}

      {tab === 'historial' && (
        <div className="flex flex-col gap-2 p-3">
          {histLoading ? (
            <p className="text-xs text-gray-400">Cargando historial...</p>
          ) : historial.length === 0 ? (
            <p className="text-xs text-gray-400">Sin alertas registradas</p>
          ) : (
            historial.map((a) => (
              <div
                key={a.id}
                className={`rounded border p-2.5 text-xs flex items-start justify-between gap-2 ${
                  a.leida ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-red-50 border-red-200'
                }`}
              >
                <div>
                  <div className="font-semibold text-gray-800">{a.carrera_nombre}</div>
                  <div className="text-gray-600">{TIPO_LABELS[a.tipo] ?? a.tipo}</div>
                  {a.mensaje && <div className="text-gray-500 mt-0.5">{a.mensaje}</div>}
                </div>
                {!a.leida && (
                  <button
                    onClick={() => handleMarkRead(a.id)}
                    className="shrink-0 text-xs text-blue-600 hover:text-blue-800 whitespace-nowrap"
                  >
                    ✓ Leída
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

'use client'
import { useEffect, useState } from 'react'
import { getKpisNoticias } from '@/lib/api'
import type { D7Result } from '@/lib/types'

function Gauge({ value, label, title }: { value: number; label: string; title: string }) {
  const pct = Math.round(value * 100)
  const color = value >= 0.6 ? 'text-green-700' : value >= 0.4 ? 'text-yellow-600' : 'text-gray-500'
  const ring = value >= 0.6 ? 'stroke-green-500' : value >= 0.4 ? 'stroke-yellow-400' : 'stroke-gray-300'
  const r = 28
  const circ = 2 * Math.PI * r
  const dash = circ * value

  return (
    <div className="flex flex-col items-center gap-1" title={title}>
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} fill="none" stroke="#e5e7eb" strokeWidth="6" />
        <circle
          cx="36" cy="36" r={r} fill="none"
          className={ring}
          strokeWidth="6"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 36 36)"
        />
        <text x="36" y="40" textAnchor="middle" className={`text-xs font-bold fill-current ${color}`} fontSize="13">
          {value.toFixed(2)}
        </text>
      </svg>
      <span className="text-xs text-gray-600 text-center">{label}</span>
    </div>
  )
}

export default function NoticiasKpiSection() {
  const [d7, setD7] = useState<D7Result | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getKpisNoticias()
      .then((r) => setD7(r.d7_noticias))
      .catch(() => setD7(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-gray-400 py-4">Cargando D7...</p>
  if (!d7) return <p className="text-gray-400 py-4">Sin datos de noticias disponibles.</p>

  const scoreColor = d7.score >= 0.6 ? 'text-green-700' : d7.score >= 0.4 ? 'text-yellow-700' : 'text-gray-500'

  return (
    <div className="max-w-sm">
      <div className="border rounded bg-white p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">D7 — Inteligencia de Noticias</p>
            <p className="text-xs text-gray-400 mt-0.5">Señal mediática global · tiempo real</p>
          </div>
          <span className={`text-3xl font-bold ${scoreColor}`}>{d7.score.toFixed(2)}</span>
        </div>
        <div className="flex justify-around">
          <Gauge
            value={d7.isn}
            label="ISN — Señal Noticias"
            title="Correlación volumen noticias por sector vs cambio en vacantes (lag 1 semana)"
          />
          <Gauge
            value={d7.vdm}
            label="VDM — Velocidad Difusión"
            title="Artículos/hora en últimas 72h, normalizado (5/h = máx)"
          />
        </div>
        <p className="text-xs text-gray-400 mt-4 text-center">
          Score = ISN×0.60 + VDM×0.40
        </p>
      </div>
    </div>
  )
}

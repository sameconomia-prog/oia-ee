'use client'
import { useState } from 'react'
import { getKpisEstado } from '@/lib/api'
import type { D5Result } from '@/lib/types'

const ESTADOS_MX = [
  'Aguascalientes','Baja California','Baja California Sur','Campeche','Chiapas',
  'Chihuahua','Ciudad de México','Coahuila','Colima','Durango','Guanajuato',
  'Guerrero','Hidalgo','Jalisco','Estado de México','Michoacán','Morelos',
  'Nayarit','Nuevo León','Oaxaca','Puebla','Querétaro','Quintana Roo',
  'San Luis Potosí','Sinaloa','Sonora','Tabasco','Tamaulipas','Tlaxcala',
  'Veracruz','Yucatán','Zacatecas',
]

function MetricBar({ label, value, invert, title }: {
  label: string; value: number; invert?: boolean; title: string
}) {
  const pct = Math.round(value * 100)
  const good = invert ? value < 0.4 : value >= 0.6
  const warn = invert ? value < 0.7 : value >= 0.4
  const color = good ? 'bg-green-500' : warn ? 'bg-yellow-400' : 'bg-red-400'
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span title={title}>{label}</span>
        <span className="font-mono font-semibold">{value.toFixed(3)}</span>
      </div>
      <div className="w-full bg-gray-100 rounded h-2">
        <div className={`${color} h-2 rounded transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function EstadoKpiSection() {
  const [estado, setEstado] = useState('Jalisco')
  const [d5, setD5] = useState<D5Result | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function buscar() {
    setLoading(true)
    setError(null)
    getKpisEstado(estado)
      .then((r) => setD5(r.d5_geografia))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Error'))
      .finally(() => setLoading(false))
  }

  const scoreColor = d5
    ? d5.score >= 0.6 ? 'text-green-700' : d5.score >= 0.4 ? 'text-yellow-700' : 'text-red-700'
    : 'text-gray-400'

  return (
    <div className="max-w-md">
      <div className="flex gap-2 mb-4">
        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          className="flex-1 border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
        >
          {ESTADOS_MX.map((e) => <option key={e}>{e}</option>)}
        </select>
        <button
          onClick={buscar}
          disabled={loading}
          className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Cargando...' : 'Consultar'}
        </button>
      </div>

      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

      {d5 && (
        <div className="border rounded bg-white p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-gray-700">D5 — {estado}</span>
            <span className={`text-2xl font-bold ${scoreColor}`}>{d5.score.toFixed(2)}</span>
          </div>
          <MetricBar
            label="IDR — Índice Despidos IA"
            value={d5.idr}
            invert
            title="Alto = más riesgo de despidos por IA en la región"
          />
          <MetricBar
            label="ICG — Competitividad Geográfica"
            value={d5.icg}
            title="% IES con carreras digitalmente actualizadas"
          />
          <MetricBar
            label="IES-S — Score Empleo Sectorial"
            value={d5.ies_s}
            title="Relación vacantes locales vs despidos nacionales"
          />
          <p className="text-xs text-gray-400 mt-3">
            Score = (1-IDR)×0.35 + ICG×0.35 + IES-S×0.30
          </p>
        </div>
      )}
    </div>
  )
}

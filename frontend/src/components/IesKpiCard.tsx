'use client'
import { useEffect, useState } from 'react'
import { getKpisIes } from '@/lib/api'
import type { D4Result } from '@/lib/types'

function ScoreBadge({ value, invert = false }: { value: number; invert?: boolean }) {
  const good = invert ? value < 0.4 : value >= 0.6
  const warn = invert ? value < 0.7 : value >= 0.4
  const color = good ? 'bg-green-100 text-green-800' : warn ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-mono font-semibold ${color}`}>
      {value.toFixed(2)}
    </span>
  )
}

function MetricRow({ label, value, invert, title }: { label: string; value: number; invert?: boolean; title: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b last:border-0">
      <span className="text-xs text-gray-500" title={title}>{label}</span>
      <ScoreBadge value={value} invert={invert} />
    </div>
  )
}

export default function IesKpiCard({ iesId }: { iesId: string }) {
  const [d4, setD4] = useState<D4Result | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getKpisIes(iesId)
      .then((r) => setD4(r?.d4_institucional ?? null))
      .catch(() => setD4(null))
      .finally(() => setLoading(false))
  }, [iesId])

  if (loading) return <div className="text-xs text-gray-400 py-2">Cargando D4...</div>
  if (!d4) return null

  return (
    <div className="border rounded bg-white p-3 mt-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">D4 — Institucional</span>
        <ScoreBadge value={d4.score} />
      </div>
      <MetricRow label="TRA — Retención" value={d4.tra} title="Tasa Retención-Absorción" />
      <MetricRow label="IRF — Riesgo Fin." value={d4.irf} invert title="Índice Riesgo Financiero (alto=riesgo)" />
      <MetricRow label="CAD — Actualización" value={d4.cad} title="Cobertura Actualización Digital" />
    </div>
  )
}

'use client'
import { useState } from 'react'
import Link from 'next/link'
import type { SkillConvergencia, ConvergenceDirection } from '@/lib/types'

const HORIZONTE_CONFIG: { key: string; label: string; range: string; bg: string; border: string; dot: string }[] = [
  { key: 'corto', label: 'Corto plazo', range: '< 2 años', bg: 'bg-red-50', border: 'border-red-200', dot: 'bg-red-400' },
  { key: 'medio', label: 'Mediano plazo', range: '2–5 años', bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-400' },
  { key: 'largo', label: 'Largo plazo', range: '> 5 años', bg: 'bg-blue-50', border: 'border-blue-200', dot: 'bg-blue-400' },
]

const DIR_ICON: Record<string, string> = {
  declining: '↓', growing: '↑', mixed: '◐', stable: '→', sin_datos: '—',
}

const DIR_COLOR: Record<string, string> = {
  declining: 'text-red-600', growing: 'text-emerald-600',
  mixed: 'text-yellow-600', stable: 'text-slate-500', sin_datos: 'text-slate-300',
}

function HorizontePanel({
  config,
  list,
  careerSlug,
}: {
  config: typeof HORIZONTE_CONFIG[number]
  list: SkillConvergencia[]
  careerSlug?: string
}) {
  const [expanded, setExpanded] = useState(false)
  const declining = list.filter(s => s.direccion_global === 'declining').length
  const growing = list.filter(s => s.direccion_global === 'growing').length
  const visible = expanded ? list : list.slice(0, 5)

  return (
    <div className={`rounded-lg border p-3 ${config.bg} ${config.border}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={`w-2 h-2 rounded-full shrink-0 ${config.dot}`} />
        <span className="text-xs font-bold text-slate-700">{config.label}</span>
      </div>
      <p className="text-[10px] text-slate-400 mb-2">{config.range} · {list.length} skill{list.length !== 1 ? 's' : ''}</p>
      <div className="flex gap-3 text-[10px] mb-2">
        {declining > 0 && <span className="text-red-600 font-semibold">{declining}↓ riesgo</span>}
        {growing > 0 && <span className="text-emerald-600 font-semibold">{growing}↑ oport.</span>}
      </div>
      <div className="space-y-0.5">
        {visible.map(s => (
          <div key={s.skill_id} className="flex items-center gap-1.5">
            <span className={`text-[10px] font-bold shrink-0 ${DIR_COLOR[s.direccion_global]}`}>
              {DIR_ICON[s.direccion_global]}
            </span>
            {careerSlug ? (
              <Link
                href={`/benchmarks/skills/${s.skill_id}?from=${careerSlug}&nombre=${encodeURIComponent(s.skill_nombre)}`}
                className="text-[10px] text-slate-600 hover:text-brand-700 hover:underline leading-tight truncate"
              >
                {s.skill_nombre}
              </Link>
            ) : (
              <span className="text-[10px] text-slate-600 leading-tight truncate">{s.skill_nombre}</span>
            )}
          </div>
        ))}
        {list.length > 5 && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-[10px] text-brand-600 hover:underline mt-0.5"
          >
            {expanded ? 'Mostrar menos' : `+${list.length - 5} más`}
          </button>
        )}
      </div>
    </div>
  )
}

export default function HorizonteTimeline({
  skills,
  careerSlug,
}: {
  skills: SkillConvergencia[]
  careerSlug?: string
}) {
  const byHorizonte: Record<string, SkillConvergencia[]> = { corto: [], medio: [], largo: [], null: [] }
  for (const s of skills) {
    const h = s.horizonte_dominante ?? 'null'
    ;(byHorizonte[h] ?? byHorizonte['null']).push(s)
  }

  const hasData = HORIZONTE_CONFIG.some(h => byHorizonte[h.key].length > 0)
  if (!hasData) return null

  return (
    <div>
      <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-widest mb-3">
        Horizonte de impacto
      </h3>
      <div className="grid grid-cols-3 gap-3">
        {HORIZONTE_CONFIG.map(h => {
          const list = byHorizonte[h.key]
          if (list.length === 0) return null
          return <HorizontePanel key={h.key} config={h} list={list} careerSlug={careerSlug} />
        })}
      </div>
    </div>
  )
}

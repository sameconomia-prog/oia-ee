'use client'
import { useState } from 'react'
import Link from 'next/link'
import type { SkillConvergencia, AccionCurricular } from '@/lib/types'

const ACCIONES: { key: AccionCurricular; label: string; desc: string; icon: string; bg: string; border: string; text: string }[] = [
  {
    key: 'retirar',
    label: 'Retirar',
    desc: 'Skills altamente automatizables sin valor diferencial futuro. Libera espacio curricular.',
    icon: '✕',
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
  },
  {
    key: 'redisenar',
    label: 'Rediseñar',
    desc: 'Skills que deben evolucionar: orientar hacia supervisión de IA o aplicación de nivel superior.',
    icon: '↺',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-800',
  },
  {
    key: 'fortalecer',
    label: 'Fortalecer',
    desc: 'Skills con demanda creciente o alta resiliencia. Aumentar profundidad y práctica.',
    icon: '↑',
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-800',
  },
  {
    key: 'agregar',
    label: 'Agregar',
    desc: 'Skills ausentes en el plan actual pero críticas para el mercado laboral con IA.',
    icon: '+',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
  },
]

function ActionCard({
  accion,
  skills,
  total,
  careerSlug,
}: {
  accion: typeof ACCIONES[number]
  skills: SkillConvergencia[]
  total: number
  careerSlug?: string
}) {
  const [expanded, setExpanded] = useState(false)
  const count = skills.length
  const pct = Math.round(count / total * 100)
  const visible = expanded ? skills : skills.slice(0, 5)

  return (
    <div className={`rounded-lg border p-3 ${accion.bg} ${accion.border}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-bold uppercase tracking-widest ${accion.text}`}>
          {accion.icon} {accion.label}
        </span>
        <span className={`text-lg font-bold font-mono ${accion.text}`}>{count}</span>
      </div>
      <p className="text-[10px] text-slate-500 leading-tight mb-2">{accion.desc}</p>
      <div className="h-1 bg-white/60 rounded-full overflow-hidden mb-1.5">
        <div className={`h-full rounded-full ${accion.text.replace('text-', 'bg-').replace('-800', '-400')}`}
          style={{ width: `${pct}%` }} />
      </div>
      <div className="space-y-0.5">
        {visible.map(s => (
          careerSlug ? (
            <Link
              key={s.skill_id}
              href={`/benchmarks/skills/${s.skill_id}?from=${careerSlug}&nombre=${encodeURIComponent(s.skill_nombre)}`}
              className="block text-[10px] text-slate-600 hover:text-brand-700 hover:underline leading-tight"
            >
              • {s.skill_nombre}
            </Link>
          ) : (
            <p key={s.skill_id} className="text-[10px] text-slate-600 leading-tight">• {s.skill_nombre}</p>
          )
        ))}
        {skills.length > 5 && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-[10px] text-brand-600 hover:underline mt-0.5"
          >
            {expanded ? 'Mostrar menos' : `+${skills.length - 5} más`}
          </button>
        )}
      </div>
    </div>
  )
}

export default function CurriculumActionSummary({
  skills,
  careerSlug,
}: {
  skills: SkillConvergencia[]
  careerSlug?: string
}) {
  const byAccion = Object.fromEntries(
    ACCIONES.map(a => [a.key, skills.filter(s => s.accion_curricular === a.key)])
  ) as Record<AccionCurricular, SkillConvergencia[]>

  const total = skills.length
  const hasAny = ACCIONES.some(a => byAccion[a.key].length > 0)
  if (!hasAny) return null

  return (
    <div>
      <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-widest mb-3">
        Recomendaciones curriculares
      </h3>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {ACCIONES.map(a => {
          if (byAccion[a.key].length === 0) return null
          return (
            <ActionCard key={a.key} accion={a} skills={byAccion[a.key]} total={total} careerSlug={careerSlug} />
          )
        })}
      </div>
    </div>
  )
}

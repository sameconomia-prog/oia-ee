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

export default function CurriculumActionSummary({ skills }: { skills: SkillConvergencia[] }) {
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
          const count = byAccion[a.key].length
          if (count === 0) return null
          const pct = Math.round(count / total * 100)
          return (
            <div key={a.key} className={`rounded-lg border p-3 ${a.bg} ${a.border}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-bold uppercase tracking-widest ${a.text}`}>
                  {a.icon} {a.label}
                </span>
                <span className={`text-lg font-bold font-mono ${a.text}`}>{count}</span>
              </div>
              <p className="text-[10px] text-slate-500 leading-tight mb-2">{a.desc}</p>
              <div className="h-1 bg-white/60 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${a.text.replace('text-', 'bg-').replace('-800', '-400')}`}
                  style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-1.5 space-y-0.5">
                {byAccion[a.key].slice(0, 5).map(s => (
                  <p key={s.skill_id} className="text-[10px] text-slate-600 leading-tight">• {s.skill_nombre}</p>
                ))}
                {byAccion[a.key].length > 5 && (
                  <p className="text-[10px] text-slate-400">+{byAccion[a.key].length - 5} más</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

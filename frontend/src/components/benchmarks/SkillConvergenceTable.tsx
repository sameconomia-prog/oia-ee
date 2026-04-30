import Link from 'next/link'
import type { BenchmarkSource, SkillConvergencia, ConvergenceDirection } from '@/lib/types'
import ConvergenceIcon from './ConvergenceIcon'
import CurriculumBadge from './CurriculumBadge'

function shortSourceName(nombre: string): string {
  return nombre.split('—')[0].trim().split(' ').slice(0, 2).join(' ')
}

function ConsensoBadge({ pct, fuentes }: { pct: number; fuentes: number }) {
  const color =
    pct >= 80 ? 'text-emerald-700 bg-emerald-50' :
    pct >= 50 ? 'text-yellow-700 bg-yellow-50' :
    'text-slate-500 bg-slate-100'
  return (
    <span
      className={`inline-flex flex-col items-center leading-none text-[10px] font-semibold px-1.5 py-1 rounded ${color}`}
      title={`${fuentes} fuente${fuentes !== 1 ? 's' : ''} con datos`}
    >
      <span className="text-xs font-bold">{fuentes > 0 ? `${pct}%` : '—'}</span>
      <span className="opacity-60">{fuentes}/5</span>
    </span>
  )
}

export default function SkillConvergenceTable({
  skills,
  sources,
  careerSlug,
}: {
  skills: SkillConvergencia[]
  sources: BenchmarkSource[]
  careerSlug?: string
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">
              Habilidad
            </th>
            {sources.map((s) => (
              <th key={s.id} className="text-center px-3 py-3 font-semibold text-gray-600 whitespace-nowrap text-xs">
                {shortSourceName(s.nombre)}
              </th>
            ))}
            <th className="text-center px-3 py-3 font-semibold text-gray-700 whitespace-nowrap text-xs">
              Global
            </th>
            <th className="text-center px-2 py-3 font-semibold text-gray-600 whitespace-nowrap text-xs">
              Consenso
            </th>
            <th className="text-left px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">
              Acción
            </th>
          </tr>
        </thead>
        <tbody>
          {skills.map((skill, i) => (
            <tr
              key={skill.skill_id}
              className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
            >
              <td className="px-4 py-3">
                {careerSlug ? (
                  <Link
                    href={`/benchmarks/skills/${skill.skill_id}?from=${careerSlug}&nombre=${encodeURIComponent(skill.skill_nombre)}`}
                    className="font-medium text-brand-700 hover:underline"
                  >
                    {skill.skill_nombre}
                  </Link>
                ) : (
                  <div className="font-medium text-gray-900">{skill.skill_nombre}</div>
                )}
                <div className="text-xs text-gray-400 capitalize mt-0.5">{skill.skill_tipo}</div>
              </td>
              {sources.map((s) => (
                <td key={s.id} className="text-center px-3 py-3">
                  <ConvergenceIcon
                    direction={
                      (skill.convergencia_por_fuente[s.id] ?? 'sin_datos') as ConvergenceDirection
                    }
                  />
                </td>
              ))}
              <td className="text-center px-3 py-3">
                <ConvergenceIcon direction={skill.direccion_global} />
              </td>
              <td className="text-center px-2 py-3">
                <ConsensoBadge pct={skill.consenso_pct} fuentes={skill.fuentes_con_datos} />
              </td>
              <td className="px-4 py-3">
                <CurriculumBadge accion={skill.accion_curricular} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

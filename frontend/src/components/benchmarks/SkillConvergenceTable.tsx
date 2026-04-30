import type { BenchmarkSource, SkillConvergencia, ConvergenceDirection } from '@/lib/types'
import ConvergenceIcon from './ConvergenceIcon'
import CurriculumBadge from './CurriculumBadge'

function shortSourceName(nombre: string): string {
  return nombre.split('—')[0].trim().split(' ').slice(0, 2).join(' ')
}

export default function SkillConvergenceTable({
  skills,
  sources,
}: {
  skills: SkillConvergencia[]
  sources: BenchmarkSource[]
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
                <div className="font-medium text-gray-900">{skill.skill_nombre}</div>
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

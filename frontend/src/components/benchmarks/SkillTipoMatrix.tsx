import type { SkillConvergencia } from '@/lib/types'

const TIPOS = ['tecnica', 'digital', 'transversal', 'social'] as const
const TIPO_LABEL: Record<string, string> = {
  tecnica: 'Técnicas', digital: 'Digitales', transversal: 'Transversales', social: 'Sociales',
}
const DIRS = ['declining', 'growing', 'mixed'] as const
const DIR_LABEL: Record<string, string> = { declining: 'Declining', growing: 'Growing', mixed: 'Mixed' }
const DIR_HEADER: Record<string, string> = { declining: 'text-red-600', growing: 'text-emerald-600', mixed: 'text-yellow-600' }
const DIR_CELL: Record<string, string> = {
  declining: 'bg-red-50 text-red-700',
  growing: 'bg-emerald-50 text-emerald-700',
  mixed: 'bg-yellow-50 text-yellow-700',
}

export default function SkillTipoMatrix({ skills }: { skills: SkillConvergencia[] }) {
  const matrix: Record<string, Record<string, number>> = {}
  for (const tipo of TIPOS) {
    matrix[tipo] = { declining: 0, growing: 0, mixed: 0 }
  }
  for (const s of skills) {
    const tipo = TIPOS.includes(s.skill_tipo as typeof TIPOS[number]) ? s.skill_tipo : null
    if (!tipo) continue
    const dir = s.direccion_global === 'stable' ? 'mixed' : DIRS.includes(s.direccion_global as typeof DIRS[number]) ? s.direccion_global : null
    if (!dir) continue
    matrix[tipo][dir]++
  }

  const hasData = TIPOS.some(t => DIRS.some(d => matrix[t][d] > 0))
  if (!hasData) return null

  return (
    <div>
      <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-widest mb-3">
        Distribución por categoría
      </h3>
      <div className="overflow-x-auto">
        <table className="text-xs border-collapse w-full max-w-md">
          <thead>
            <tr>
              <th className="text-left px-3 py-2 text-slate-500 font-medium border-b border-slate-200"></th>
              {DIRS.map(d => (
                <th key={d} className={`text-center px-3 py-2 font-semibold border-b border-slate-200 ${DIR_HEADER[d]}`}>
                  {DIR_LABEL[d]}
                </th>
              ))}
              <th className="text-center px-3 py-2 text-slate-500 font-medium border-b border-slate-200">Total</th>
            </tr>
          </thead>
          <tbody>
            {TIPOS.map(tipo => {
              const row = matrix[tipo]
              const total = DIRS.reduce((s, d) => s + row[d], 0)
              if (total === 0) return null
              return (
                <tr key={tipo} className="border-b border-slate-100">
                  <td className="px-3 py-2 font-medium text-slate-700">{TIPO_LABEL[tipo]}</td>
                  {DIRS.map(d => (
                    <td key={d} className={`text-center px-3 py-2 font-mono font-bold ${row[d] > 0 ? DIR_CELL[d] : 'text-slate-300'}`}>
                      {row[d] > 0 ? row[d] : '—'}
                    </td>
                  ))}
                  <td className="text-center px-3 py-2 font-mono text-slate-500">{total}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

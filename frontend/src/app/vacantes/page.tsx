'use client'
import { useEffect, useState, useMemo } from 'react'
import { getVacantesPublico, getVacantesTopSkills } from '@/lib/api'
import type { VacantePublico, SkillFreq } from '@/lib/types'

export const metadata = { title: 'Vacantes IA · OIA-EE' }

const SALARIO_FMT = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n)

export default function VacantesPage() {
  const [vacantes, setVacantes] = useState<VacantePublico[]>([])
  const [skills, setSkills] = useState<SkillFreq[]>([])
  const [sectorFiltro, setSectorFiltro] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getVacantesTopSkills(10).then(setSkills).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    getVacantesPublico(sectorFiltro || undefined, 50)
      .then(setVacantes)
      .catch(() => setVacantes([]))
      .finally(() => setLoading(false))
  }, [sectorFiltro])

  const sectores = useMemo(() => {
    const s = new Set(vacantes.map(v => v.sector).filter(Boolean) as string[])
    return Array.from(s).sort()
  }, [vacantes])

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Vacantes con perfil IA</h1>
        <p className="text-sm text-gray-500">
          Empleos que demandan habilidades relacionadas con inteligencia artificial en México.
        </p>
      </div>

      {/* Skills demandadas */}
      {skills.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {skills.map(s => (
            <button
              key={s.nombre}
              onClick={() => {}}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium"
            >
              {s.nombre}
              <span className="bg-indigo-200 text-indigo-800 rounded-full px-1.5 py-0.5 text-[10px] font-bold">{s.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Filtro sector */}
      <div className="flex items-center gap-3 mb-4">
        <select
          value={sectorFiltro}
          onChange={e => setSectorFiltro(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
        >
          <option value="">Todos los sectores</option>
          {sectores.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <span className="text-xs text-gray-400">{vacantes.length} vacantes</span>
      </div>

      {/* Lista */}
      {loading ? (
        <p className="text-gray-400 text-sm py-8 text-center">Cargando...</p>
      ) : vacantes.length === 0 ? (
        <p className="text-gray-400 text-sm py-8 text-center">Sin vacantes disponibles.</p>
      ) : (
        <div className="space-y-3">
          {vacantes.map(v => (
            <div key={v.id} className="bg-white border rounded-xl p-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-gray-900 text-sm">{v.titulo}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {[v.empresa, v.estado, v.sector].filter(Boolean).join(' · ')}
                  </p>
                  {v.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {v.skills.map(s => (
                        <span key={s} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[11px]">{s}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  {v.salario_min && v.salario_max ? (
                    <p className="text-sm font-semibold text-gray-800">
                      {SALARIO_FMT(v.salario_min)} – {SALARIO_FMT(v.salario_max)}
                    </p>
                  ) : null}
                  {v.experiencia_anios != null && (
                    <p className="text-xs text-gray-400 mt-0.5">{v.experiencia_anios} años exp.</p>
                  )}
                  {v.nivel_educativo && (
                    <p className="text-xs text-gray-400">{v.nivel_educativo}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

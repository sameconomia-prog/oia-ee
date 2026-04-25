'use client'
import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { getVacantesPublico, getVacantesTopSkills, getSectoresVacantes } from '@/lib/api'
import type { VacantePublico, SkillFreq } from '@/lib/types'

const SALARIO_FMT = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n)

function exportarCSV(vacantes: VacantePublico[]) {
  const headers = ['Titulo', 'Empresa', 'Sector', 'Skills', 'Salario Min', 'Salario Max', 'Estado', 'Nivel Educativo', 'Experiencia', 'Fecha Pub']
  const rows = vacantes.map(v => [
    v.titulo,
    v.empresa ?? '',
    v.sector ?? '',
    v.skills.join('; '),
    v.salario_min ?? '',
    v.salario_max ?? '',
    v.estado ?? '',
    v.nivel_educativo ?? '',
    v.experiencia_anios ?? '',
    v.fecha_pub ?? '',
  ])
  const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `vacantes_ia_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function VacantesPage() {
  const [vacantes, setVacantes] = useState<VacantePublico[]>([])
  const [skills, setSkills] = useState<SkillFreq[]>([])
  const [sectores, setSectores] = useState<string[]>([])
  const [sectorFiltro, setSectorFiltro] = useState<string>('')
  const [busqueda, setBusqueda] = useState('')
  const [loading, setLoading] = useState(true)

  const vacantesFiltradas = useMemo(() => {
    if (!busqueda.trim()) return vacantes
    const q = busqueda.toLowerCase()
    return vacantes.filter(v =>
      v.titulo.toLowerCase().includes(q) ||
      (v.empresa ?? '').toLowerCase().includes(q) ||
      v.skills.some(s => s.toLowerCase().includes(q))
    )
  }, [vacantes, busqueda])

  useEffect(() => {
    getVacantesTopSkills(10).then(setSkills).catch(() => {})
    getSectoresVacantes().then(setSectores).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    getVacantesPublico(sectorFiltro || undefined, 50)
      .then(setVacantes)
      .catch(() => setVacantes([]))
      .finally(() => setLoading(false))
  }, [sectorFiltro])

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
              onClick={() => setBusqueda(prev => prev === s.nombre ? '' : s.nombre)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${busqueda === s.nombre ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`}
            >
              {s.nombre}
              <span className="bg-indigo-200 text-indigo-800 rounded-full px-1.5 py-0.5 text-[10px] font-bold">{s.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <input
          type="text"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar título, empresa, skill..."
          className="border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 flex-1 min-w-[200px]"
        />
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
        {busqueda && (
          <button onClick={() => setBusqueda('')} className="text-xs text-gray-400 hover:text-gray-700">✕</button>
        )}
        <span className="text-xs text-gray-400">{vacantesFiltradas.length} vacantes</span>
        {vacantesFiltradas.length > 0 && (
          <button
            onClick={() => exportarCSV(vacantesFiltradas)}
            className="ml-auto text-xs px-3 py-1.5 border rounded hover:bg-gray-50 text-gray-600 transition-colors"
          >
            ↓ Exportar CSV
          </button>
        )}
      </div>

      {/* Lista */}
      {loading ? (
        <p className="text-gray-400 text-sm py-8 text-center">Cargando...</p>
      ) : vacantesFiltradas.length === 0 ? (
        <p className="text-gray-400 text-sm py-8 text-center">Sin vacantes disponibles.</p>
      ) : (
        <div className="space-y-3">
          {vacantesFiltradas.map(v => (
            <div key={v.id} className="bg-white border rounded-xl p-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <Link href={`/vacantes/${v.id}`} className="font-semibold text-gray-900 text-sm hover:text-indigo-700 hover:underline">{v.titulo}</Link>
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

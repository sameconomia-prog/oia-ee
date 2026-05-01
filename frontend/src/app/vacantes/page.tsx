'use client'
import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { getVacantesPublico, getVacantesTopSkills, getSectoresVacantes, getVacantesTendencia, getBenchmarkSkillsIndex } from '@/lib/api'
import type { VacantePublico, SkillFreq, VacanteTendencia, SkillIndexItem } from '@/lib/types'

function normStr(s: string) {
  return s.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

const DIR_ICON: Record<string, { icon: string; cls: string }> = {
  growing:  { icon: '↑', cls: 'text-emerald-500' },
  declining:{ icon: '↓', cls: 'text-red-400' },
  mixed:    { icon: '~', cls: 'text-amber-500' },
  stable:   { icon: '→', cls: 'text-slate-400' },
}

function TendenciaChart({ data }: { data: VacanteTendencia[] }) {
  if (data.length < 2) return null
  const maxCount = Math.max(...data.map(d => d.count), 1)
  const W = 300, H = 40, BAR_W = Math.max(4, Math.floor((W - data.length) / data.length))
  return (
    <div className="flex items-end gap-1 h-10">
      {data.map((d, i) => (
        <div
          key={i}
          title={`${d.mes}: ${d.count} vacantes`}
          className="bg-indigo-400 hover:bg-indigo-600 rounded-t transition-colors"
          style={{ height: `${Math.max(4, (d.count / maxCount) * H)}px`, width: `${BAR_W}px` }}
        />
      ))}
    </div>
  )
}

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
  const [tendencia, setTendencia] = useState<VacanteTendencia[]>([])
  const [sectorFiltro, setSectorFiltro] = useState<string>('')
  const [busqueda, setBusqueda] = useState('')
  const [loading, setLoading] = useState(true)
  const [skip, setSkip] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [skillsIndex, setSkillsIndex] = useState<SkillIndexItem[]>([])
  const PAGE_SIZE = 25

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
    getVacantesTendencia(12).then(setTendencia).catch(() => {})
    getBenchmarkSkillsIndex().then(setSkillsIndex).catch(() => {})
  }, [])

  const skillSignalMap = useMemo(() => {
    if (skillsIndex.length === 0) return new Map<string, SkillIndexItem>()
    const map = new Map<string, SkillIndexItem>()
    for (const sf of skills) {
      const q = normStr(sf.nombre)
      const match = skillsIndex.find(item => normStr(item.skill_nombre) === q) ??
        skillsIndex.find(item => normStr(item.skill_nombre).includes(q) || q.includes(normStr(item.skill_nombre)))
      if (match) map.set(sf.nombre, match)
    }
    return map
  }, [skills, skillsIndex])

  const cargar = (newSkip: number, append: boolean) => {
    setLoading(true)
    getVacantesPublico({ sector: sectorFiltro || undefined, skip: newSkip, limit: PAGE_SIZE })
      .then(data => {
        setVacantes(prev => append ? [...prev, ...data] : data)
        setSkip(newSkip + data.length)
        setHasMore(data.length === PAGE_SIZE)
      })
      .catch(() => setVacantes([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    setSkip(0)
    setVacantes([])
    cargar(0, false)
  }, [sectorFiltro]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Vacantes con perfil IA</h1>
          <p className="text-sm text-gray-500">
            Empleos que demandan habilidades relacionadas con inteligencia artificial en México.
          </p>
        </div>
        {tendencia.length > 1 && (
          <div className="shrink-0">
            <p className="text-xs text-gray-400 mb-1 text-right">Vacantes por mes</p>
            <TendenciaChart data={tendencia} />
          </div>
        )}
      </div>

      {/* Skills demandadas */}
      {skills.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {skills.map(s => {
            const signal = skillSignalMap.get(s.nombre)
            const dir = signal ? DIR_ICON[signal.direccion_global] : null
            const active = busqueda === s.nombre
            return (
              <button
                key={s.nombre}
                onClick={() => setBusqueda(prev => prev === s.nombre ? '' : s.nombre)}
                title={signal ? `${signal.skill_nombre} — ${signal.direccion_global} (${signal.consenso_pct}% consenso)` : undefined}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${active ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`}
              >
                {s.nombre}
                {dir && (
                  <span className={`font-bold text-[11px] ${active ? 'text-white/90' : dir.cls}`}>{dir.icon}</span>
                )}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${active ? 'bg-white/20 text-white' : 'bg-indigo-200 text-indigo-800'}`}>{s.count}</span>
              </button>
            )
          })}
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
      {hasMore && !loading && !busqueda && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={() => cargar(skip, true)}
            className="px-5 py-2 border rounded-lg text-sm hover:bg-gray-50"
          >
            Cargar más
          </button>
        </div>
      )}
      {loading && vacantes.length > 0 && (
        <p className="text-center text-gray-400 text-xs mt-3">Cargando...</p>
      )}
    </div>
  )
}

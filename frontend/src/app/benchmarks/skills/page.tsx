// frontend/src/app/benchmarks/skills/page.tsx
'use client'
import { useEffect, useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { getBenchmarkSkillsIndex, getBenchmarkCareers } from '@/lib/api'
import type { SkillIndexItem, BenchmarkCareerSummary, ConvergenceDirection } from '@/lib/types'
import ConvergenceIcon from '@/components/benchmarks/ConvergenceIcon'
import Card from '@/components/ui/Card'
import SectionHeader from '@/components/ui/SectionHeader'

const AREA_LABELS: Record<string, string> = {
  artes_y_humanidades: 'Artes',
  ciencias_de_la_salud: 'Salud',
  ciencias_economico_administrativas: 'Económico-Adm',
  ciencias_sociales: 'Ciencias Sociales',
  ciencias_sociales_y_humanidades: 'Sociales/Hum',
  ingenieria_y_tecnologia: 'Ing. y Tec.',
}

function ConsensoBar({ pct, fuentes }: { pct: number; fuentes: number }) {
  const color = pct >= 80 ? 'bg-emerald-400' : pct >= 50 ? 'bg-yellow-400' : 'bg-slate-300'
  return (
    <div className="flex items-center gap-1.5" title={`${fuentes}/5 fuentes · ${pct}% acuerdo`}>
      <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-mono text-slate-400">{fuentes}/5</span>
    </div>
  )
}

function exportSkillsCSV(skills: SkillIndexItem[], careerBySlug: Record<string, BenchmarkCareerSummary>) {
  const header = 'ID,Habilidad,Tipo,Dirección global,Fuentes con datos,Consenso %,Carreras'
  const rows = skills.map(s => [
    s.skill_id,
    `"${s.skill_nombre}"`,
    s.skill_tipo,
    s.direccion_global,
    s.fuentes_con_datos,
    s.consenso_pct,
    `"${s.carreras.map(slug => careerBySlug[slug]?.nombre ?? slug).join('; ')}"`,
  ].join(','))
  const csv = [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `benchmark-skills-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const TIPO_LABELS: Record<string, string> = {
  tecnica: 'Técnica',
  digital: 'Digital',
  transversal: 'Transversal',
  social: 'Social',
}

export default function SkillsIndexPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [skills, setSkills] = useState<SkillIndexItem[]>([])
  const [careers, setCareers] = useState<BenchmarkCareerSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '')
  const [filterDir, setFilterDir] = useState<ConvergenceDirection | 'all'>(
    () => (searchParams.get('dir') as ConvergenceDirection | 'all') ?? 'all'
  )
  const [filterCareer, setFilterCareer] = useState<string>(() => searchParams.get('carrera') ?? 'all')
  const [filterTipo, setFilterTipo] = useState<string>(() => searchParams.get('tipo') ?? 'all')

  useEffect(() => {
    Promise.all([getBenchmarkSkillsIndex(), getBenchmarkCareers()])
      .then(([s, c]) => { setSkills(s); setCareers(c) })
      .finally(() => setLoading(false))
  }, [])

  const updateParams = useCallback((updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([k, v]) => {
      if (v === 'all' || v === '') params.delete(k)
      else params.set(k, v)
    })
    router.replace(`?${params.toString()}`, { scroll: false })
  }, [router, searchParams])

  const setDir = (v: ConvergenceDirection | 'all') => { setFilterDir(v); updateParams({ dir: v }) }
  const setCareer = (v: string) => { setFilterCareer(v); updateParams({ carrera: v }) }
  const setTipo = (v: string) => { setFilterTipo(v); updateParams({ tipo: v }) }
  const setQ = (v: string) => { setQuery(v); updateParams({ q: v }) }

  const careerBySlug = useMemo(() => Object.fromEntries(careers.map(c => [c.slug, c])), [careers])

  const filtered = useMemo(() => skills.filter(s => {
    if (query && !s.skill_nombre.toLowerCase().includes(query.toLowerCase()) &&
        !s.skill_id.toLowerCase().includes(query.toLowerCase())) return false
    if (filterDir !== 'all' && s.direccion_global !== filterDir) return false
    if (filterCareer !== 'all' && !s.carreras.includes(filterCareer)) return false
    if (filterTipo !== 'all' && s.skill_tipo !== filterTipo) return false
    return true
  }), [skills, query, filterDir, filterCareer, filterTipo])

  const tiposPresentes = useMemo(() => {
    const tipos = new Set(skills.map(s => s.skill_tipo))
    return ['tecnica', 'digital', 'transversal', 'social'].filter(t => tipos.has(t))
  }, [skills])

  const counts = useMemo(() => {
    const all = skills
    return {
      declining: all.filter(s => s.direccion_global === 'declining').length,
      growing: all.filter(s => s.direccion_global === 'growing').length,
      mixed: all.filter(s => ['mixed', 'stable'].includes(s.direccion_global)).length,
      sin_datos: all.filter(s => s.direccion_global === 'sin_datos').length,
    }
  }, [skills])

  if (loading) return <p className="text-slate-400 text-sm py-8 text-center">Cargando skills...</p>

  const btnBase = 'text-[11px] px-2.5 py-1 rounded-full border transition-colors whitespace-nowrap'
  const btnActive = 'bg-brand-600 text-white border-brand-600'
  const btnInactive = 'bg-white text-slate-600 border-slate-200 hover:border-brand-400'

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-5">
        <Link href="/benchmarks" className="text-xs text-brand-600 hover:underline">← Benchmarks Globales</Link>
        <div className="mt-2">
          <SectionHeader
            title="Índice de Habilidades"
            subtitle={`${skills.length} habilidades · ${careers.length} carreras · 5 fuentes internacionales`}
          />
        </div>
      </div>

      {/* Summary stats */}
      <Card className="mb-5 p-4">
        <div className="flex gap-6 text-sm flex-wrap">
          <span className="text-red-600 font-semibold">{counts.declining} declining</span>
          <span className="text-emerald-600 font-semibold">{counts.growing} growing</span>
          <span className="text-yellow-600 font-semibold">{counts.mixed} mixed</span>
          {counts.sin_datos > 0 && <span className="text-slate-400 font-semibold">{counts.sin_datos} sin datos</span>}
        </div>
      </Card>

      {/* Filters */}
      <div className="space-y-2 mb-3">
        <div className="flex flex-wrap gap-2 items-center">
          <input
            type="text"
            value={query}
            onChange={e => setQ(e.target.value)}
            placeholder="Buscar habilidad…"
            className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 w-48 bg-white text-slate-700"
          />
          <div className="flex gap-1.5 flex-wrap">
            {([['all', 'Todas'], ['declining', 'Declining'], ['growing', 'Growing'], ['mixed', 'Mixed']] as [string, string][]).map(([d, l]) => (
              <button key={d} onClick={() => setDir(d as ConvergenceDirection | 'all')}
                className={`${btnBase} ${filterDir === d ? btnActive : btnInactive}`}>{l}</button>
            ))}
          </div>
          <select
            value={filterCareer}
            onChange={e => setCareer(e.target.value)}
            className="text-xs border border-slate-200 rounded px-2 py-1.5 bg-white text-slate-600 ml-auto"
          >
            <option value="all">Todas las carreras</option>
            {careers.map(c => <option key={c.slug} value={c.slug}>{c.nombre.split('/')[0].trim()}</option>)}
          </select>
          {skills.length > 0 && (
            <button
              onClick={() => exportSkillsCSV(filtered, careerBySlug)}
              className="text-xs text-slate-600 border border-slate-200 px-3 py-1.5 rounded hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              ↓ CSV ({filtered.length})
            </button>
          )}
        </div>
        {tiposPresentes.length > 0 && (
          <div className="flex gap-1.5 flex-wrap items-center">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest">Tipo:</span>
            <button onClick={() => setTipo('all')}
              className={`${btnBase} ${filterTipo === 'all' ? btnActive : btnInactive}`}>Todos</button>
            {tiposPresentes.map(t => (
              <button key={t} onClick={() => setTipo(t)}
                className={`${btnBase} ${filterTipo === t ? btnActive : btnInactive}`}>
                {TIPO_LABELS[t] ?? t}
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="text-[11px] text-slate-400 mb-3">{filtered.length} habilidad{filtered.length !== 1 ? 'es' : ''}</p>

      {/* Skills table */}
      <Card className="p-0 overflow-hidden">
        <table className="min-w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-xs">
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Habilidad</th>
              <th className="text-center px-3 py-3 font-semibold text-gray-600">Dirección</th>
              <th className="text-center px-3 py-3 font-semibold text-gray-600">Consenso</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Carreras</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((skill, i) => (
              <tr key={skill.skill_id} className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                <td className="px-4 py-3">
                  <Link
                    href={`/benchmarks/skills/${skill.skill_id}`}
                    className="font-medium text-brand-700 hover:underline text-sm"
                  >
                    {skill.skill_nombre}
                  </Link>
                  <p className="text-[11px] text-slate-400 capitalize mt-0.5">{skill.skill_tipo}</p>
                </td>
                <td className="text-center px-3 py-3">
                  <ConvergenceIcon direction={skill.direccion_global} />
                </td>
                <td className="px-3 py-3">
                  <ConsensoBar pct={skill.consenso_pct} fuentes={skill.fuentes_con_datos} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {skill.carreras.slice(0, 3).map(slug => (
                      <Link key={slug} href={`/benchmarks/${slug}`}
                        className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded hover:bg-brand-50 hover:text-brand-700 transition-colors">
                        {(careerBySlug[slug]?.nombre ?? slug).split('/')[0].trim().split(' ').slice(0, 2).join(' ')}
                      </Link>
                    ))}
                    {skill.carreras.length > 3 && (
                      <span className="text-[10px] text-slate-400">+{skill.carreras.length - 3}</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center text-slate-400 text-xs py-8">
                  No se encontraron habilidades con esos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

// frontend/src/app/benchmarks/page.tsx
'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { getBenchmarkCareers, getBenchmarkResumen, getBenchmarkSkillsIndex, getVacantesTopSkills } from '@/lib/api'
import type { BenchmarkCareerSummary, BenchmarkResumen, SkillIndexItem, SkillFreq } from '@/lib/types'

function normSkill(s: string) {
  return s.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}
import ConvergenceIcon from '@/components/benchmarks/ConvergenceIcon'
import Card from '@/components/ui/Card'
import SectionHeader from '@/components/ui/SectionHeader'
import { BENCHMARK_ALL_ARTICLES } from '@/lib/benchmark-articles'

const ARTICLE_MAP = BENCHMARK_ALL_ARTICLES

const DIR_LABEL: Record<string, { label: string; variant: 'risk' | 'oportunidad' | 'neutro' }> = {
  declining: { label: 'Declining', variant: 'risk' },
  growing: { label: 'Growing', variant: 'oportunidad' },
  mixed: { label: 'Mixed', variant: 'neutro' },
  sin_datos: { label: 'Sin datos', variant: 'neutro' },
}

function MiniBar({ value, total, color }: { value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] font-mono text-slate-500 w-4 text-right">{value}</span>
    </div>
  )
}

function UrgenciaBadge({ score }: { score: number }) {
  const { label, color } =
    score >= 60 ? { label: 'Alta urgencia', color: 'bg-red-100 text-red-800' } :
    score >= 30 ? { label: 'Moderada', color: 'bg-amber-100 text-amber-800' } :
    { label: 'Baja', color: 'bg-green-100 text-green-800' }
  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${color}`}
      title={`Urgencia curricular: ${score}/100`}>
      {label}
    </span>
  )
}

function CareerCard({ career }: { career: BenchmarkCareerSummary }) {
  const articles = ARTICLE_MAP[career.slug] ?? []
  const total = career.total_skills

  return (
    <Card className="p-4 flex flex-col gap-3">
      <div>
        <div className="flex items-start justify-between gap-2 mb-0.5">
          <h3 className="text-sm font-semibold text-slate-800 leading-tight">{career.nombre}</h3>
          <UrgenciaBadge score={career.urgencia_curricular} />
        </div>
        <p className="text-[11px] text-slate-400">{career.area}</p>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-slate-500 uppercase tracking-widest">Skills ({total})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-red-600 w-14">Declining</span>
          <MiniBar value={career.skills_declining} total={total} color="bg-red-400" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-emerald-600 w-14">Growing</span>
          <MiniBar value={career.skills_growing} total={total} color="bg-emerald-400" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-yellow-600 w-14">Mixed</span>
          <MiniBar value={career.skills_mixed} total={total} color="bg-yellow-400" />
        </div>
        {career.skills_sin_datos > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 w-14">Sin datos</span>
            <MiniBar value={career.skills_sin_datos} total={total} color="bg-slate-200" />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-auto pt-1 border-t border-slate-100">
        <Link
          href={`/benchmarks/${career.slug}`}
          className="text-xs text-brand-600 hover:underline font-medium"
        >
          Ver matriz →
        </Link>
        {articles.length > 0 && (
          <Link
            href={`/investigaciones?benchmark=${career.slug}`}
            className="text-xs text-slate-400 hover:underline"
          >
            {articles.length} artículo{articles.length !== 1 ? 's' : ''}
          </Link>
        )}
      </div>
    </Card>
  )
}

function ResumenStat({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="text-center">
      <p className="text-2xl font-bold text-slate-900 font-mono">{value}</p>
      <p className="text-xs font-semibold text-slate-600 mt-0.5">{label}</p>
      {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
    </div>
  )
}

const AREA_LABELS: Record<string, string> = {
  artes_y_humanidades: 'Artes y Humanidades',
  ciencias_de_la_salud: 'Ciencias de la Salud',
  ciencias_economico_administrativas: 'Económico-Administrativas',
  ciencias_sociales: 'Ciencias Sociales',
  ciencias_sociales_y_humanidades: 'Sociales y Humanidades',
  ingenieria_y_tecnologia: 'Ingeniería y Tecnología',
}

type SortMode = 'default' | 'risk' | 'opportunity' | 'urgencia' | 'name'

function sortCareers(list: BenchmarkCareerSummary[], mode: SortMode): BenchmarkCareerSummary[] {
  const copy = [...list]
  if (mode === 'risk') return copy.sort((a, b) => (b.skills_declining / b.total_skills) - (a.skills_declining / a.total_skills))
  if (mode === 'opportunity') return copy.sort((a, b) => (b.skills_growing / b.total_skills) - (a.skills_growing / a.total_skills))
  if (mode === 'urgencia') return copy.sort((a, b) => b.urgencia_curricular - a.urgencia_curricular)
  if (mode === 'name') return copy.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  return copy
}

function UrgenciaBar({ value }: { value: number }) {
  const color = value >= 60 ? 'bg-red-400' : value >= 30 ? 'bg-amber-400' : 'bg-emerald-400'
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-[11px] font-mono text-slate-600 w-7 text-right">{value}</span>
    </div>
  )
}

function CareerTable({ careers }: { careers: BenchmarkCareerSummary[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-[10px] uppercase tracking-widest text-slate-400 border-b border-slate-100">
            <th className="text-left py-2 pr-4 font-semibold">#</th>
            <th className="text-left py-2 pr-4 font-semibold">Carrera</th>
            <th className="text-left py-2 pr-4 font-semibold w-48">Urgencia curricular</th>
            <th className="text-right py-2 pr-3 font-semibold text-red-500">↓</th>
            <th className="text-right py-2 pr-3 font-semibold text-emerald-500">↑</th>
            <th className="text-right py-2 pr-3 font-semibold text-yellow-500">~</th>
            <th className="text-right py-2 pr-3 font-semibold">Total</th>
            <th className="text-right py-2 font-semibold">Art.</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {careers.map((c, i) => (
            <tr key={c.slug} className="hover:bg-slate-50 transition-colors">
              <td className="py-2.5 pr-4 text-slate-400 font-mono">{i + 1}</td>
              <td className="py-2.5 pr-4">
                <Link href={`/benchmarks/${c.slug}`} className="font-medium text-slate-800 hover:text-brand-700 hover:underline">
                  {c.nombre}
                </Link>
                <span className="text-slate-400 ml-2 text-[10px]">{c.area.split('_').join(' ')}</span>
              </td>
              <td className="py-2.5 pr-4 w-48">
                <UrgenciaBar value={c.urgencia_curricular} />
              </td>
              <td className="py-2.5 pr-3 text-right font-mono text-red-600">{c.skills_declining}</td>
              <td className="py-2.5 pr-3 text-right font-mono text-emerald-600">{c.skills_growing}</td>
              <td className="py-2.5 pr-3 text-right font-mono text-yellow-600">{c.skills_mixed}</td>
              <td className="py-2.5 pr-3 text-right font-mono text-slate-500">{c.total_skills}</td>
              <td className="py-2.5 text-right">
                {(ARTICLE_MAP[c.slug]?.length ?? 0) > 0 && (
                  <Link href={`/investigaciones?benchmark=${c.slug}`} className="text-[10px] text-brand-600 hover:underline font-medium">
                    {ARTICLE_MAP[c.slug].length}
                  </Link>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function exportCSV(careers: BenchmarkCareerSummary[]) {
  const header = 'Slug,Carrera,Area,Urgencia,Declining,Growing,Mixed,Sin datos,Total'
  const rows = careers.map(c =>
    [c.slug, `"${c.nombre}"`, `"${c.area}"`, c.urgencia_curricular,
     c.skills_declining, c.skills_growing, c.skills_mixed, c.skills_sin_datos, c.total_skills].join(',')
  )
  const csv = [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `benchmarks-globales-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function BenchmarksPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [careers, setCareers] = useState<BenchmarkCareerSummary[]>([])
  const [resumen, setResumen] = useState<BenchmarkResumen | null>(null)
  const [skillsIndex, setSkillsIndex] = useState<SkillIndexItem[]>([])
  const [vacanteSkills, setVacanteSkills] = useState<SkillFreq[]>([])
  const [loading, setLoading] = useState(true)
  const [filterArea, setFilterArea] = useState<string>(() => searchParams.get('area') ?? 'all')
  const [sortMode, setSortMode] = useState<SortMode>(() => (searchParams.get('sort') as SortMode) ?? 'default')
  const [filterQ, setFilterQ] = useState<string>(() => searchParams.get('q') ?? '')
  const [filterUrgencia, setFilterUrgencia] = useState<boolean>(() => searchParams.get('urgencia') === '1')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')

  useEffect(() => {
    Promise.all([
      getBenchmarkCareers(),
      getBenchmarkResumen(),
      getBenchmarkSkillsIndex(),
      getVacantesTopSkills(50).catch(() => [] as SkillFreq[]),
    ]).then(([c, r, s, vs]) => { setCareers(c); setResumen(r); setSkillsIndex(s); setVacanteSkills(vs) })
      .finally(() => setLoading(false))
  }, [])

  const topUrgentes = useMemo(() =>
    [...skillsIndex]
      .filter(s => s.direccion_global === 'declining' && s.fuentes_con_datos > 0)
      .sort((a, b) => b.consenso_pct - a.consenso_pct || b.fuentes_con_datos - a.fuentes_con_datos)
      .slice(0, 6),
    [skillsIndex]
  )

  const tipoBreakdown = useMemo(() => {
    const TIPOS = ['tecnica', 'digital', 'transversal', 'social'] as const
    const counts: Record<string, { declining: number; growing: number; mixed: number; total: number }> = {}
    for (const t of TIPOS) counts[t] = { declining: 0, growing: 0, mixed: 0, total: 0 }
    for (const s of skillsIndex) {
      if (!(s.skill_tipo in counts)) continue
      const row = counts[s.skill_tipo]
      row.total++
      if (s.direccion_global === 'declining') row.declining++
      else if (s.direccion_global === 'growing') row.growing++
      else if (s.direccion_global === 'mixed' || s.direccion_global === 'stable') row.mixed++
    }
    return TIPOS.map(t => ({ tipo: t, ...counts[t] })).filter(r => r.total > 0)
  }, [skillsIndex])

  const brechaSkills = useMemo(() => {
    if (vacanteSkills.length === 0 || skillsIndex.length === 0) return []
    const vacNorms = new Map(vacanteSkills.map(sf => [normSkill(sf.nombre), sf.count]))
    return skillsIndex
      .filter(item => item.direccion_global === 'declining')
      .map(item => {
        const q = normSkill(item.skill_nombre)
        const count = vacNorms.get(q) ??
          Array.from(vacNorms.entries()).find(([k]) => k.includes(q) || q.includes(k))?.[1] ?? 0
        return { ...item, vacanteCount: count }
      })
      .filter(item => item.vacanteCount > 0)
      .sort((a, b) => b.vacanteCount - a.vacanteCount || b.consenso_pct - a.consenso_pct)
      .slice(0, 6)
  }, [skillsIndex, vacanteSkills])

  const calientesSkills = useMemo(() => {
    if (vacanteSkills.length === 0 || skillsIndex.length === 0) return []
    const vacNorms = new Map(vacanteSkills.map(sf => [normSkill(sf.nombre), sf.count]))
    return skillsIndex
      .filter(item => item.direccion_global === 'growing')
      .map(item => {
        const q = normSkill(item.skill_nombre)
        const count = vacNorms.get(q) ??
          Array.from(vacNorms.entries()).find(([k]) => k.includes(q) || q.includes(k))?.[1] ?? 0
        return { ...item, vacanteCount: count }
      })
      .filter(item => item.vacanteCount > 0)
      .sort((a, b) => b.vacanteCount - a.vacanteCount || b.consenso_pct - a.consenso_pct)
      .slice(0, 6)
  }, [skillsIndex, vacanteSkills])

  const updateParams = useCallback((updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([k, v]) => {
      if (v === 'all' || v === 'default' || v === '') params.delete(k)
      else params.set(k, v)
    })
    const qs = params.toString()
    router.replace(qs ? `?${qs}` : '?', { scroll: false })
  }, [router, searchParams])

  const setArea = (v: string) => { setFilterArea(v); updateParams({ area: v }) }
  const setSort = (v: SortMode) => { setSortMode(v); updateParams({ sort: v }) }
  const setQ = (v: string) => { setFilterQ(v); updateParams({ q: v }) }
  const toggleUrgencia = () => {
    const next = !filterUrgencia
    setFilterUrgencia(next)
    updateParams({ urgencia: next ? '1' : '' })
  }

  if (loading) return <p className="text-slate-400 text-sm py-8 text-center">Cargando benchmarks...</p>

  const areas = Array.from(new Set(careers.map(c => c.area))).sort()
  const qNorm = filterQ.toLowerCase().trim()
  const base = careers
    .filter(c => filterArea === 'all' || c.area === filterArea)
    .filter(c => !qNorm || c.nombre.toLowerCase().includes(qNorm))
    .filter(c => !filterUrgencia || c.urgencia_curricular >= 60)
  const filtered = sortCareers(base, sortMode)

  const btnBase = 'text-[11px] px-2.5 py-1 rounded-full border transition-colors whitespace-nowrap'
  const btnActive = 'bg-brand-600 text-white border-brand-600'
  const btnInactive = 'bg-white text-slate-600 border-slate-200 hover:border-brand-400'

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6 flex items-start justify-between">
        <SectionHeader
          title="Benchmarks Globales"
          subtitle="Convergencia de 5 fuentes internacionales sobre la exposición de habilidades a la automatización por IA"
        />
        <div className="flex gap-2 mt-1">
          <Link
            href="/benchmarks/skills"
            className="shrink-0 text-xs text-brand-600 border border-brand-200 px-3 py-1.5 rounded hover:bg-brand-50 transition-colors font-medium"
          >
            Índice de skills →
          </Link>
          <Link
            href="/benchmarks/comparar"
            className="shrink-0 text-xs text-brand-600 border border-brand-200 px-3 py-1.5 rounded hover:bg-brand-50 transition-colors font-medium"
          >
            Comparar →
          </Link>
          <Link
            href="/benchmarks/fuentes"
            className="shrink-0 text-xs text-brand-600 border border-brand-200 px-3 py-1.5 rounded hover:bg-brand-50 transition-colors font-medium"
          >
            Fuentes →
          </Link>
          {careers.length > 0 && (
            <button
              onClick={() => exportCSV(careers)}
              className="shrink-0 text-xs text-slate-600 border border-slate-200 px-3 py-1.5 rounded hover:bg-slate-50 transition-colors font-medium"
            >
              ↓ CSV
            </button>
          )}
        </div>
      </div>

      {/* CTA rector */}
      <div className="mb-6 rounded-xl bg-indigo-50 border border-indigo-200 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-indigo-800">¿Eres rector o coordinador académico?</p>
          <p className="text-xs text-indigo-600 mt-0.5">Solicita el análisis de pertinencia curricular de tu institución — diagnóstico personalizado, gratuito.</p>
        </div>
        <Link
          href="/pertinencia"
          className="shrink-0 text-xs font-semibold text-indigo-700 border border-indigo-300 bg-white px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors whitespace-nowrap"
        >
          Solicitar análisis gratuito →
        </Link>
      </div>

      {resumen && (
        <Card className="mb-6 p-5">
          <div className="grid grid-cols-4 gap-6 divide-x divide-slate-100">
            <ResumenStat label="Carreras analizadas" value={resumen.total_carreras} />
            <ResumenStat label="Fuentes internacionales" value={resumen.total_fuentes} sub="WEF · McKinsey · CEPAL · Frey-Osborne · Anthropic" />
            <ResumenStat label="Skills totales" value={resumen.total_skills} />
            <div className="text-center pl-6">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">Distribución global</p>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-red-600">Declining</span>
                  <span className="font-mono text-slate-700">{resumen.skills_declining}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-emerald-600">Growing</span>
                  <span className="font-mono text-slate-700">{resumen.skills_growing}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-yellow-600">Mixed/Stable</span>
                  <span className="font-mono text-slate-700">{resumen.skills_mixed_stable}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Tipo × direction breakdown */}
      {tipoBreakdown.length > 0 && (
        <Card className="mb-6 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-widest">
              Exposición por categoría de habilidad
            </h3>
            <Link href="/benchmarks/skills" className="text-[11px] text-brand-600 hover:underline">
              Ver índice →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {tipoBreakdown.map(({ tipo, declining, growing, mixed, total }) => {
              const TIPO_LABEL: Record<string, string> = { tecnica: 'Técnicas', digital: 'Digitales', transversal: 'Transversales', social: 'Sociales' }
              const pctD = total > 0 ? Math.round((declining / total) * 100) : 0
              const pctG = total > 0 ? Math.round((growing / total) * 100) : 0
              return (
                <div key={tipo} className="border border-slate-100 rounded-lg p-3">
                  <p className="text-[11px] font-semibold text-slate-600 mb-2">{TIPO_LABEL[tipo] ?? tipo}</p>
                  <div className="flex h-2 rounded-full overflow-hidden mb-2 gap-px">
                    <div className="bg-red-400" style={{ width: `${pctD}%` }} title={`Declining: ${declining}`} />
                    <div className="bg-emerald-400" style={{ width: `${pctG}%` }} title={`Growing: ${growing}`} />
                    <div className="bg-yellow-300 flex-1" title={`Mixed: ${mixed}`} />
                  </div>
                  <div className="text-[10px] text-slate-500 space-y-0.5">
                    <div className="flex justify-between"><span className="text-red-600">↓ {declining}</span><span className="text-emerald-600">↑ {growing}</span><span className="text-yellow-600">~ {mixed}</span></div>
                    <p className="text-slate-400">{total} skills · {pctD}% en riesgo</p>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Top urgentes */}
      {topUrgentes.length > 0 && (
        <Card className="mb-6 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-widest">
              Skills más urgentes <span className="text-red-500">↓</span>
            </h3>
            <Link href="/benchmarks/skills?dir=declining&sort=urgencia" className="text-[11px] text-brand-600 hover:underline">
              Ver todas →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {topUrgentes.map(s => (
              <Link
                key={s.skill_id}
                href={`/benchmarks/skills/${s.skill_id}`}
                className="flex items-center gap-2 p-2 rounded-lg bg-red-50/60 hover:bg-red-50 border border-red-100 transition-colors"
              >
                <ConvergenceIcon direction="declining" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-700 truncate leading-tight">{s.skill_nombre}</p>
                  <p className="text-[10px] text-slate-400 capitalize">{s.skill_tipo} · {s.consenso_pct}% consenso</p>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Brecha curricular */}
      {brechaSkills.length > 0 && (
        <Card className="mb-6 p-4 border-amber-200 bg-amber-50/30">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs font-semibold text-amber-800 uppercase tracking-widest">
                ⚠ Brecha curricular
              </h3>
              <p className="text-[10px] text-amber-600 mt-0.5">Skills en declive global que empleadores siguen demandando en México</p>
            </div>
            <Link href="/vacantes" className="text-[11px] text-amber-700 hover:underline font-medium">
              Ver vacantes →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {brechaSkills.map(s => (
              <div key={s.skill_id} className="flex items-center gap-2 p-2 rounded-lg bg-white border border-amber-200 hover:border-amber-300 transition-colors">
                <span className="text-red-500 font-bold text-sm shrink-0">↓</span>
                <div className="flex-1 min-w-0">
                  <Link href={`/benchmarks/skills/${s.skill_id}`} className="text-xs font-medium text-slate-700 truncate leading-tight hover:underline block">{s.skill_nombre}</Link>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-slate-400">{s.consenso_pct}% consenso</span>
                    <Link href={`/vacantes?q=${encodeURIComponent(s.skill_nombre)}`} className="text-[10px] text-amber-700 hover:underline font-medium">{s.vacanteCount} vacantes →</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Skills calientes */}
      {calientesSkills.length > 0 && (
        <Card className="mb-6 p-4 border-emerald-200 bg-emerald-50/30">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs font-semibold text-emerald-800 uppercase tracking-widest">
                ✦ Skills calientes
              </h3>
              <p className="text-[10px] text-emerald-600 mt-0.5">Creciendo globalmente y en demanda laboral en México</p>
            </div>
            <Link href="/benchmarks/skills?dir=growing" className="text-[11px] text-emerald-700 hover:underline font-medium">
              Ver todas →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {calientesSkills.map(s => (
              <div key={s.skill_id} className="flex items-center gap-2 p-2 rounded-lg bg-white border border-emerald-200 hover:border-emerald-300 transition-colors">
                <span className="text-emerald-500 font-bold text-sm shrink-0">↑</span>
                <div className="flex-1 min-w-0">
                  <Link href={`/benchmarks/skills/${s.skill_id}`} className="text-xs font-medium text-slate-700 truncate leading-tight hover:underline block">{s.skill_nombre}</Link>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-slate-400">{s.consenso_pct}% consenso</span>
                    <Link href={`/vacantes?q=${encodeURIComponent(s.skill_nombre)}`} className="text-[10px] text-emerald-700 hover:underline font-medium">{s.vacanteCount} vacantes →</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Search */}
      <div className="mb-3 flex gap-2">
        <input
          type="text"
          value={filterQ}
          onChange={e => setQ(e.target.value)}
          placeholder="Buscar carrera..."
          className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-400 bg-white"
        />
        {filterQ && (
          <button onClick={() => setQ('')} className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-500 hover:bg-slate-50">
            ✕
          </button>
        )}
      </div>

      {/* Area filter */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <button onClick={() => setArea('all')} className={`${btnBase} ${filterArea === 'all' ? btnActive : btnInactive}`}>
          Todas ({careers.length})
        </button>
        {areas.map(a => (
          <button key={a} onClick={() => setArea(a)} className={`${btnBase} ${filterArea === a ? btnActive : btnInactive}`}>
            {AREA_LABELS[a] ?? a} ({careers.filter(c => c.area === a).length})
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-3">
        <button
          onClick={toggleUrgencia}
          title="Mostrar solo carreras con urgencia curricular ≥ 60"
          className={`px-2.5 py-1 text-xs rounded border transition-colors ${filterUrgencia ? 'bg-red-50 border-red-300 text-red-700 font-semibold' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
        >
          ⚠ Urgencia ≥ 60
        </button>
        {(filterUrgencia || filterQ || filterArea !== 'all') && (
          <button
            onClick={() => { setFilterUrgencia(false); setQ(''); setArea('all') }}
            className="px-2.5 py-1 text-xs rounded border border-gray-200 text-gray-400 hover:bg-gray-50"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      <details className="mb-3 text-[11px] text-slate-500 border border-slate-100 rounded-lg px-3 py-2 bg-slate-50/50">
        <summary className="cursor-pointer hover:text-slate-700 select-none font-medium">¿Cómo leer este índice?</summary>
        <div className="mt-2 space-y-1 leading-relaxed">
          <p><span className="font-semibold text-slate-700">Urgencia curricular (0–100)</span> — porcentaje de skills en declive × consenso promedio entre fuentes. ≥60 = intervención necesaria.</p>
          <p><span className="font-semibold text-slate-700">Declining/Growing/Mixed</span> — dirección global según convergencia de WEF, McKinsey, CEPAL, Frey-Osborne y Anthropic.</p>
          <p><span className="font-semibold text-slate-700">Acción recomendada</span> — retirar (eliminar del plan), rediseñar (actualizar con IA), fortalecer (profundizar) o agregar (nuevo contenido).</p>
        </div>
      </details>

      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-700 shrink-0">
          {filtered.length} carrera{filtered.length !== 1 ? 's' : ''}
          {filterArea !== 'all' && <span className="font-normal text-slate-400"> · {AREA_LABELS[filterArea] ?? filterArea}</span>}
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 uppercase tracking-widest whitespace-nowrap">Ordenar:</span>
          <select
            value={sortMode}
            onChange={e => setSort(e.target.value as SortMode)}
            className="text-[11px] border border-slate-200 rounded px-2 py-1 text-slate-600 bg-white"
          >
            <option value="default">Default</option>
            <option value="urgencia">Mayor urgencia</option>
            <option value="risk">Mayor riesgo</option>
            <option value="opportunity">Mayor oportunidad</option>
            <option value="name">Nombre A–Z</option>
          </select>
          <div className="flex border border-slate-200 rounded overflow-hidden ml-1">
            <button
              onClick={() => setViewMode('grid')}
              title="Vista tarjetas"
              className={`px-2.5 py-1 text-[11px] transition-colors ${viewMode === 'grid' ? 'bg-brand-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              ▦
            </button>
            <button
              onClick={() => setViewMode('table')}
              title="Vista tabla"
              className={`px-2.5 py-1 text-[11px] transition-colors ${viewMode === 'table' ? 'bg-brand-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              ☰
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {filtered.map(c => <CareerCard key={c.slug} career={c} />)}
        </div>
      ) : (
        <Card className="p-4">
          <CareerTable careers={filtered} />
        </Card>
      )}

      <p className="text-xs text-slate-400 mt-6 text-center">
        Fuentes: WEF Future of Jobs 2025 · McKinsey 2023 · Frey-Osborne 2013 · CEPAL 2023 · Anthropic Economic Index 2025
      </p>
    </div>
  )
}

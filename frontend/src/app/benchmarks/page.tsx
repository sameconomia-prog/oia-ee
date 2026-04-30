// frontend/src/app/benchmarks/page.tsx
'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getBenchmarkCareers, getBenchmarkResumen } from '@/lib/api'
import type { BenchmarkCareerSummary, BenchmarkResumen } from '@/lib/types'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import SectionHeader from '@/components/ui/SectionHeader'

const ARTICLE_MAP: Record<string, string> = {
  'derecho': '2026-04-derecho-ia-2030',
  'medicina': '2026-04-medicina-ia-mexico',
  'arquitectura': '2026-04-arquitectura-ia-2030',
  'enfermeria': '2026-04-enfermeria-ia-2030',
  'mercadotecnia': '2026-04-mercadotecnia-ia-2030',
  'psicologia': '2026-04-psicologia-ia-2030',
  'administracion-empresas': '2026-04-administracion-ia-2030',
  'contaduria': '2026-04-contaduria-ia-2030',
  'diseno-grafico': '2026-04-diseno-grafico-ia-2030',
  'ingenieria-sistemas': '2026-04-ingenieros-software-ia',
  'comunicacion': '2026-04-comunicacion-ia-2030',
  'economia': '2026-04-economia-ia-2030',
  'educacion': '2026-04-educacion-ia-2030',
  'turismo': '2026-04-turismo-ia-2030',
  'ciencias-politicas': '2026-04-ciencias-politicas-ia-2030',
  'nutricion': '2026-04-nutricion-ia-2030',
  'ingenieria-civil': '2026-04-ingenieria-civil-ia-2030',
}

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
  const article = ARTICLE_MAP[career.slug]
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
        {article && (
          <Link
            href={`/investigaciones/${article}`}
            className="text-xs text-slate-400 hover:underline"
          >
            Análisis
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

export default function BenchmarksPage() {
  const [careers, setCareers] = useState<BenchmarkCareerSummary[]>([])
  const [resumen, setResumen] = useState<BenchmarkResumen | null>(null)
  const [loading, setLoading] = useState(true)
  const [filterArea, setFilterArea] = useState<string>('all')
  const [sortMode, setSortMode] = useState<SortMode>('default')

  useEffect(() => {
    Promise.all([getBenchmarkCareers(), getBenchmarkResumen()])
      .then(([c, r]) => { setCareers(c); setResumen(r) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-slate-400 text-sm py-8 text-center">Cargando benchmarks...</p>

  const areas = Array.from(new Set(careers.map(c => c.area))).sort()
  const base = filterArea === 'all' ? careers : careers.filter(c => c.area === filterArea)
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
        </div>
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

      {/* Area filter */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <button onClick={() => setFilterArea('all')} className={`${btnBase} ${filterArea === 'all' ? btnActive : btnInactive}`}>
          Todas ({careers.length})
        </button>
        {areas.map(a => (
          <button key={a} onClick={() => setFilterArea(a)} className={`${btnBase} ${filterArea === a ? btnActive : btnInactive}`}>
            {AREA_LABELS[a] ?? a} ({careers.filter(c => c.area === a).length})
          </button>
        ))}
      </div>

      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-700 shrink-0">
          {filtered.length} carrera{filtered.length !== 1 ? 's' : ''}
          {filterArea !== 'all' && <span className="font-normal text-slate-400"> · {AREA_LABELS[filterArea] ?? filterArea}</span>}
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 uppercase tracking-widest whitespace-nowrap">Ordenar:</span>
          <select
            value={sortMode}
            onChange={e => setSortMode(e.target.value as SortMode)}
            className="text-[11px] border border-slate-200 rounded px-2 py-1 text-slate-600 bg-white"
          >
            <option value="default">Default</option>
            <option value="urgencia">Mayor urgencia</option>
            <option value="risk">Mayor riesgo</option>
            <option value="opportunity">Mayor oportunidad</option>
            <option value="name">Nombre A–Z</option>
          </select>
          <div className="flex gap-2 text-[11px] text-slate-400 ml-2">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block"></span>Declining</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>Growing</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block"></span>Mixed</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {filtered.map(c => <CareerCard key={c.slug} career={c} />)}
      </div>

      <p className="text-xs text-slate-400 mt-6 text-center">
        Fuentes: WEF Future of Jobs 2025 · McKinsey 2023 · Frey-Osborne 2013 · CEPAL 2023 · Anthropic Economic Index 2025
      </p>
    </div>
  )
}

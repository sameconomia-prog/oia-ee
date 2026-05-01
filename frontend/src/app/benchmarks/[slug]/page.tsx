// frontend/src/app/benchmarks/[slug]/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { getBenchmarkCareerDetail, getBenchmarkSources, getBenchmarkCareers } from '@/lib/api'
import type { BenchmarkCareerDetail, BenchmarkSource, BenchmarkCareerSummary } from '@/lib/types'
import SkillConvergenceTable from '@/components/benchmarks/SkillConvergenceTable'
import CurriculumActionSummary from '@/components/benchmarks/CurriculumActionSummary'
import HorizonteTimeline from '@/components/benchmarks/HorizonteTimeline'
import SkillTipoMatrix from '@/components/benchmarks/SkillTipoMatrix'
import Card from '@/components/ui/Card'
import SectionHeader from '@/components/ui/SectionHeader'
import Badge from '@/components/ui/Badge'
import { BENCHMARK_TO_ARTICLE } from '@/lib/benchmark-articles'

function exportCSV(detail: BenchmarkCareerDetail, sources: BenchmarkSource[]) {
  const header = ['Habilidad', 'Tipo', ...sources.map(s => s.nombre.split('—')[0].trim()), 'Global', 'Consenso%', 'Acción'].join(',')
  const rows = detail.skills.map(skill => {
    const sourceCols = sources.map(s => skill.convergencia_por_fuente[s.id] ?? 'sin_datos')
    return [
      `"${skill.skill_nombre}"`,
      skill.skill_tipo,
      ...sourceCols,
      skill.direccion_global,
      skill.consenso_pct,
      skill.accion_curricular,
    ].join(',')
  })
  const csv = [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `benchmark-${detail.slug}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const ARTICLE_MAP = BENCHMARK_TO_ARTICLE

const DIR_COLORS: Record<string, string> = {
  declining: 'text-red-600',
  growing: 'text-emerald-600',
  mixed: 'text-yellow-600',
  stable: 'text-yellow-600',
  sin_datos: 'text-slate-400',
}

export default function BenchmarkCareerPage() {
  const { slug } = useParams<{ slug: string }>()
  const [detail, setDetail] = useState<BenchmarkCareerDetail | null>(null)
  const [sources, setSources] = useState<BenchmarkSource[]>([])
  const [related, setRelated] = useState<BenchmarkCareerSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!slug) return
    Promise.all([
      getBenchmarkCareerDetail(slug),
      getBenchmarkSources(),
      getBenchmarkCareers(),
    ])
      .then(([d, s, all]) => {
        setDetail(d)
        setSources(s)
        setRelated(all.filter(c => c.slug !== slug && c.area === d.area).slice(0, 3))
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) return <p className="text-slate-400 text-sm py-8 text-center">Cargando...</p>

  if (notFound || !detail) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500 text-sm mb-4">Carrera no encontrada en benchmarks.</p>
        <Link href="/benchmarks" className="text-brand-600 text-sm hover:underline">← Benchmarks globales</Link>
      </div>
    )
  }

  const declining = detail.skills.filter(s => s.direccion_global === 'declining').length
  const growing = detail.skills.filter(s => s.direccion_global === 'growing').length
  const mixed = detail.skills.filter(s => ['mixed', 'stable'].includes(s.direccion_global)).length
  const sinDatos = detail.skills.filter(s => s.direccion_global === 'sin_datos').length
  const article = ARTICLE_MAP[slug]

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <Link href="/benchmarks" className="text-xs text-brand-600 hover:underline">← Benchmarks Globales</Link>
        <div className="flex items-start justify-between mt-2">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{detail.nombre}</h1>
            <p className="text-sm text-slate-500 mt-1">{detail.area}</p>
          </div>
          <div className="flex items-center gap-3 ml-6 mt-1 shrink-0">
            <Link
              href={`/benchmarks/comparar?a=${slug}`}
              className="text-xs text-brand-600 border border-brand-200 px-3 py-1.5 rounded hover:bg-brand-50 transition-colors font-medium"
            >
              Comparar →
            </Link>
            {article && (
              <Link
                href={`/investigaciones/${article}`}
                className="text-xs text-brand-600 hover:underline font-medium"
              >
                Análisis completo →
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <Card className="mb-6 p-4">
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Total skills:</span>
            <span className="font-bold font-mono text-slate-800">{detail.skills.length}</span>
          </div>
          <div className="h-4 w-px bg-slate-200" />
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-400"></span>
            <span className="text-red-600 font-medium">{declining} declining</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="text-emerald-600 font-medium">{growing} growing</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
            <span className="text-yellow-600 font-medium">{mixed} mixed</span>
          </div>
          {sinDatos > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-200"></span>
              <span className="text-slate-400 font-medium">{sinDatos} sin datos</span>
            </div>
          )}
        </div>
      </Card>

      {/* Convergence table */}
      <Card className="mb-6 p-5">
        <div className="flex items-start justify-between mb-4">
          <SectionHeader
            title="Matriz de convergencia por fuente"
            subtitle={`${sources.length} fuentes internacionales · ${detail.skills.length} habilidades analizadas`}
          />
          <button
            onClick={() => exportCSV(detail, sources)}
            className="shrink-0 ml-4 text-xs text-brand-600 border border-brand-200 px-3 py-1.5 rounded hover:bg-brand-50 transition-colors font-medium"
          >
            Descargar CSV
          </button>
        </div>
        <SkillConvergenceTable skills={detail.skills} sources={sources} careerSlug={slug} />
      </Card>

      {/* Tipo × direction matrix */}
      <Card className="mb-6 p-5">
        <SkillTipoMatrix skills={detail.skills} />
      </Card>

      {/* Curricular recommendations */}
      <Card className="mb-6 p-5">
        <CurriculumActionSummary skills={detail.skills} />
      </Card>

      {/* Horizonte timeline */}
      <Card className="mb-6 p-5">
        <HorizonteTimeline skills={detail.skills} />
      </Card>

      {/* Sources legend */}
      <Card className="p-4">
        <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-widest mb-3">Fuentes</h3>
        <div className="space-y-2">
          {sources.map(s => (
            <div key={s.id} className="flex items-start gap-3">
              <Badge variant="neutro">{s.año}</Badge>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 leading-tight">{s.nombre}</p>
                <p className="text-xs text-slate-400 mt-0.5">{s.dato_clave}</p>
              </div>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-brand-600 hover:underline shrink-0"
              >
                Ver fuente
              </a>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

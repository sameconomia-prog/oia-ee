// frontend/src/app/benchmarks/[slug]/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { getBenchmarkCareerDetail, getBenchmarkSources, getBenchmarkCareers, getCarrerasPublico, getVacantesTopSkills } from '@/lib/api'
import type { BenchmarkCareerDetail, BenchmarkSource, BenchmarkCareerSummary, CarreraKpi, SkillFreq } from '@/lib/types'

function normS(s: string) {
  return s.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}
import SkillConvergenceTable from '@/components/benchmarks/SkillConvergenceTable'
import CurriculumActionSummary from '@/components/benchmarks/CurriculumActionSummary'
import HorizonteTimeline from '@/components/benchmarks/HorizonteTimeline'
import SkillTipoMatrix from '@/components/benchmarks/SkillTipoMatrix'
import Card from '@/components/ui/Card'
import SectionHeader from '@/components/ui/SectionHeader'
import Badge from '@/components/ui/Badge'
import { BENCHMARK_TO_ARTICLE, BENCHMARK_ALL_ARTICLES } from '@/lib/benchmark-articles'

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
  type ArticleCard = { slug: string; titulo: string; tipo: string; fecha: string; tiempo_lectura: string; resumen?: string }

  const [detail, setDetail] = useState<BenchmarkCareerDetail | null>(null)
  const [sources, setSources] = useState<BenchmarkSource[]>([])
  const [related, setRelated] = useState<BenchmarkCareerSummary[]>([])
  const [mexicoCarreras, setMexicoCarreras] = useState<CarreraKpi[]>([])
  const [vacanteSkills, setVacanteSkills] = useState<SkillFreq[]>([])
  const [lecturas, setLecturas] = useState<ArticleCard[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [copied, setCopied] = useState(false)
  const [copiedDiag, setCopiedDiag] = useState(false)
  const [urgencia, setUrgencia] = useState(0)

  useEffect(() => {
    if (!slug) return
    fetch(`/api/benchmark-articles/${slug}`).then(r => r.ok ? r.json() : []).then(setLecturas).catch(() => {})
    getVacantesTopSkills(50).then(setVacanteSkills).catch(() => {})
    Promise.all([
      getBenchmarkCareerDetail(slug),
      getBenchmarkSources(),
      getBenchmarkCareers(),
    ])
      .then(([d, s, all]) => {
        setDetail(d)
        setSources(s)
        setRelated(all.filter(c => c.slug !== slug && c.area === d.area).slice(0, 3))
        setUrgencia(all.find(c => c.slug === slug)?.urgencia_curricular ?? 0)
        document.title = `${d.nombre} — Benchmark Global · OIA-EE`
        return getCarrerasPublico({ q: d.nombre, limit: 30 })
      })
      .then(carreras => {
        setMexicoCarreras(carreras.filter(c => c.benchmark_slug === slug))
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
          <div className="flex items-center gap-2 ml-6 mt-1 shrink-0 flex-wrap justify-end">
            <button
              onClick={() => {
                const urgLabel = urgencia >= 60 ? 'Alta' : urgencia >= 30 ? 'Moderada' : 'Baja'
                const text = `Benchmark Global — ${detail.nombre}\nUrgencia curricular: ${urgencia}/100 (${urgLabel})\nSkills en declive: ${declining} | Skills crecientes: ${growing} | Mixed: ${mixed}\n${window.location.href}`
                navigator.clipboard.writeText(text).then(() => {
                  setCopiedDiag(true)
                  setTimeout(() => setCopiedDiag(false), 2000)
                })
              }}
              className="text-xs text-slate-500 border border-slate-200 px-3 py-1.5 rounded hover:bg-slate-50 transition-colors font-medium"
            >
              {copiedDiag ? '✓ Copiado' : 'Copiar diagnóstico'}
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href).then(() => {
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                })
              }}
              className="text-xs text-slate-500 border border-slate-200 px-3 py-1.5 rounded hover:bg-slate-50 transition-colors font-medium"
            >
              {copied ? '✓ Copiado' : 'Copiar enlace'}
            </button>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : `https://frontend-one-psi-80.vercel.app/benchmarks/${slug}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 border border-blue-200 px-3 py-1.5 rounded hover:bg-blue-50 transition-colors font-medium"
            >
              LinkedIn
            </a>
            <Link
              href={`/benchmarks/comparar?a=${slug}`}
              className="text-xs text-brand-600 border border-brand-200 px-3 py-1.5 rounded hover:bg-brand-50 transition-colors font-medium"
            >
              Comparar →
            </Link>
            {(BENCHMARK_ALL_ARTICLES[slug]?.length ?? 0) > 0 && (
              <Link
                href={`/investigaciones?benchmark=${slug}`}
                className="text-xs text-brand-600 hover:underline font-medium"
              >
                {BENCHMARK_ALL_ARTICLES[slug].length} artículo{BENCHMARK_ALL_ARTICLES[slug].length !== 1 ? 's' : ''} →
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
        <CurriculumActionSummary skills={detail.skills} careerSlug={slug} />
      </Card>

      {/* Horizonte timeline */}
      <Card className="mb-6 p-5">
        <HorizonteTimeline skills={detail.skills} careerSlug={slug} />
      </Card>

      {/* Skills calientes — growing y demandadas en MX */}
      {vacanteSkills.length > 0 && (() => {
        const vacMap = new Map(vacanteSkills.map(sf => [normS(sf.nombre), sf.count]))
        const calientesSkills = detail.skills
          .filter(sk => sk.direccion_global === 'growing')
          .map(sk => {
            const q = normS(sk.skill_nombre)
            const count = vacMap.get(q) ??
              Array.from(vacMap.entries()).find(([k]) => k.includes(q) || q.includes(k))?.[1] ?? 0
            return { ...sk, vacanteCount: count }
          })
          .filter(sk => sk.vacanteCount > 0)
          .sort((a, b) => b.vacanteCount - a.vacanteCount)
        if (calientesSkills.length === 0) return null
        return (
          <Card className="mb-6 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-widest">
                Skills calientes · {calientesSkills.length} {calientesSkills.length === 1 ? 'skill' : 'skills'}
              </h3>
              <span className="text-[11px] text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-medium">
                Creciendo globalmente y demandadas en MX
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {calientesSkills.map(sk => (
                <Link
                  key={sk.skill_id}
                  href={`/vacantes?q=${encodeURIComponent(sk.skill_nombre)}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-xs text-emerald-800 hover:bg-emerald-100 transition-colors"
                >
                  <span className="font-medium">{sk.skill_nombre}</span>
                  <span className="font-mono text-emerald-600 text-[10px]">{sk.vacanteCount} vac.</span>
                </Link>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">↑ growing globalmente · alta demanda en vacantes mexicanas · fortalecer en currículo</p>
          </Card>
        )
      })()}

      {/* Brecha de skills — declining pero demandadas en MX */}
      {vacanteSkills.length > 0 && (() => {
        const vacMap = new Map(vacanteSkills.map(sf => [normS(sf.nombre), sf.count]))
        const brechaSkills = detail.skills
          .filter(sk => sk.direccion_global === 'declining')
          .map(sk => {
            const q = normS(sk.skill_nombre)
            const count = vacMap.get(q) ??
              Array.from(vacMap.entries()).find(([k]) => k.includes(q) || q.includes(k))?.[1] ?? 0
            return { ...sk, vacanteCount: count }
          })
          .filter(sk => sk.vacanteCount > 0)
          .sort((a, b) => b.vacanteCount - a.vacanteCount)
        if (brechaSkills.length === 0) return null
        return (
          <Card className="mb-6 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-widest">
                Brecha curricular · {brechaSkills.length} {brechaSkills.length === 1 ? 'skill' : 'skills'}
              </h3>
              <span className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-medium">
                En declive global pero demandadas en MX
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {brechaSkills.map(sk => (
                <Link
                  key={sk.skill_id}
                  href={`/vacantes?q=${encodeURIComponent(sk.skill_nombre)}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-full text-xs text-amber-800 hover:bg-amber-100 transition-colors"
                >
                  <span className="font-medium">{sk.skill_nombre}</span>
                  <span className="font-mono text-amber-600 text-[10px]">{sk.vacanteCount} vac.</span>
                </Link>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">↓ declining globalmente · demanda activa en vacantes mexicanas · oportunidad curricular en transición</p>
          </Card>
        )
      })()}

      {/* Situación en México */}
      {mexicoCarreras.length > 0 && (
        <Card className="mb-6 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-widest">
              Situación en México · {mexicoCarreras.length} {mexicoCarreras.length === 1 ? 'carrera' : 'carreras'} registradas
            </h3>
            <Link href={`/carreras?q=${encodeURIComponent(detail.nombre)}`} className="text-[11px] text-brand-600 hover:underline">
              Ver todas →
            </Link>
          </div>
          <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
            <div className="grid grid-cols-5 bg-slate-50 text-slate-500 font-semibold px-3 py-2">
              <div className="col-span-2">Carrera / IES</div>
              <div className="text-center">D1 Riesgo</div>
              <div className="text-center">D2 Oport.</div>
              <div className="text-center">D3 Mercado</div>
            </div>
            {mexicoCarreras.map(c => {
              const d1 = c.kpi?.d1_obsolescencia.score
              const d2 = c.kpi?.d2_oportunidades.score
              const d3 = c.kpi?.d3_mercado.score
              const d1Cls = d1 == null ? '' : d1 >= 0.6 ? 'text-red-600' : d1 >= 0.4 ? 'text-amber-600' : 'text-emerald-600'
              const d2Cls = d2 == null ? '' : d2 >= 0.6 ? 'text-emerald-600' : d2 >= 0.4 ? 'text-amber-600' : 'text-red-600'
              const d3Cls = d3 == null ? '' : d3 >= 0.6 ? 'text-emerald-600' : d3 >= 0.4 ? 'text-amber-600' : 'text-red-600'
              return (
                <div key={c.id} className="grid grid-cols-5 border-t border-slate-100 px-3 py-2 hover:bg-slate-50">
                  <div className="col-span-2 truncate">
                    <Link href={`/carreras/${c.id}`} className="text-slate-700 hover:text-indigo-700 hover:underline font-medium">{c.nombre}</Link>
                  </div>
                  <div className={`text-center font-mono font-semibold ${d1Cls}`}>{d1 != null ? d1.toFixed(2) : '—'}</div>
                  <div className={`text-center font-mono font-semibold ${d2Cls}`}>{d2 != null ? d2.toFixed(2) : '—'}</div>
                  <div className={`text-center font-mono font-semibold ${d3Cls}`}>{d3 != null ? d3.toFixed(2) : '—'}</div>
                </div>
              )
            })}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">D1: menor=mejor · D2/D3: mayor=mejor</p>
        </Card>
      )}

      {/* Related careers in same area */}
      {related.length > 0 && (
        <Card className="mb-6 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-widest">
              Otras carreras en el mismo área
            </h3>
            <Link href="/benchmarks/comparar" className="text-[11px] text-brand-600 hover:underline">
              Comparar todas →
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {related.map(c => {
              const urgColor = c.urgencia_curricular >= 60 ? 'text-red-600' : c.urgencia_curricular >= 30 ? 'text-amber-600' : 'text-emerald-600'
              return (
                <div key={c.slug} className="border border-slate-100 rounded-lg p-3 bg-slate-50">
                  <Link href={`/benchmarks/${c.slug}`} className="text-xs font-medium text-slate-800 hover:text-brand-700 hover:underline block mb-1 leading-tight">
                    {c.nombre}
                  </Link>
                  <p className={`text-[11px] font-mono font-semibold ${urgColor} mb-2`}>
                    Urgencia {c.urgencia_curricular}
                  </p>
                  <Link
                    href={`/benchmarks/comparar?a=${slug}&b=${c.slug}`}
                    className="text-[11px] text-brand-600 hover:underline font-medium"
                  >
                    Comparar →
                  </Link>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Lecturas relacionadas */}
      {lecturas.length > 1 && (
        <Card className="mb-6 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-widest">
              Lecturas relacionadas
            </h3>
            <Link href={`/investigaciones?benchmark=${slug}`} className="text-[11px] text-brand-600 hover:underline">
              Más investigaciones →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {lecturas.map(a => (
              <Link
                key={a.slug}
                href={`/investigaciones/${a.slug}`}
                className="border border-slate-100 rounded-lg p-3 hover:border-brand-200 hover:bg-brand-50/20 transition-colors flex flex-col"
              >
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">{a.tipo}</span>
                <p className="text-xs font-medium text-slate-800 leading-snug mt-1 line-clamp-2">{a.titulo}</p>
                {a.resumen && (
                  <p className="text-[11px] text-slate-500 mt-1.5 line-clamp-2 leading-snug">{a.resumen}</p>
                )}
                <p className="text-[11px] text-slate-400 mt-1.5">{a.tiempo_lectura} · {new Date(a.fecha).toLocaleDateString('es-MX', { month: 'short', year: 'numeric' })}</p>
              </Link>
            ))}
          </div>
        </Card>
      )}

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

      {/* Rector CTA — show when urgencia alta */}
      {(() => {
        const isAlta = (declining / (detail.skills.length || 1)) * 100 >= 30
        return isAlta ? (
          <div className="mt-2 rounded-xl bg-indigo-50 border border-indigo-200 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-indigo-900 mb-1">
                ¿Tienes {detail.nombre} en tu institución?
              </p>
              <p className="text-xs text-indigo-700">
                Solicita el análisis personalizado: diagnóstico D1–D6, benchmarks y recomendaciones curriculares. Sin costo.
              </p>
            </div>
            <Link
              href={`/pertinencia?carrera=${encodeURIComponent(detail.nombre)}`}
              className="shrink-0 text-sm font-semibold text-white bg-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap"
            >
              Solicitar análisis →
            </Link>
          </div>
        ) : null
      })()}
    </div>
  )
}

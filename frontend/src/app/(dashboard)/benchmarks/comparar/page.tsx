// frontend/src/app/benchmarks/comparar/page.tsx
'use client'
import { useEffect, useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { getBenchmarkCareers, getBenchmarkCareerDetail, getBenchmarkSources } from '@/lib/api'
import type { BenchmarkCareerSummary, BenchmarkCareerDetail, BenchmarkSource, SkillConvergencia, ConvergenceDirection } from '@/lib/types'
import ConvergenceIcon from '@/components/benchmarks/ConvergenceIcon'
import Card from '@/components/ui/Card'
import SectionHeader from '@/components/ui/SectionHeader'

const DIR_ORDER: Record<string, number> = { declining: 0, mixed: 1, stable: 1, growing: 2, sin_datos: 3 }

function exportComparacion(
  detailA: BenchmarkCareerDetail,
  detailB: BenchmarkCareerDetail,
  sources: BenchmarkSource[]
) {
  const srcCols = sources.map(s => s.nombre ?? s.id)
  const header = ['Skill', 'Tipo', `Dir_${detailA.slug}`, `Dir_${detailB.slug}`, 'Divergencia', ...srcCols.map(n => `${n}_${detailA.slug}`), ...srcCols.map(n => `${n}_${detailB.slug}`)].join(',')
  const mapA = Object.fromEntries(detailA.skills.map(s => [s.skill_id, s]))
  const mapB = Object.fromEntries(detailB.skills.map(s => [s.skill_id, s]))
  const allIds = Array.from(new Set([...detailA.skills.map(s => s.skill_id), ...detailB.skills.map(s => s.skill_id)]))
  const rows = allIds.map(id => {
    const a = mapA[id]
    const b = mapB[id]
    const skill = a ?? b
    const dirA = a?.direccion_global ?? 'solo_B'
    const dirB = b?.direccion_global ?? 'solo_A'
    const diverge = a && b && dirA !== dirB ? 'sí' : 'no'
    const srcA = sources.map(s => a?.convergencia_por_fuente[s.id] ?? '-')
    const srcB = sources.map(s => b?.convergencia_por_fuente[s.id] ?? '-')
    return [`"${skill.skill_nombre}"`, skill.skill_tipo ?? '', dirA, dirB, diverge, ...srcA, ...srcB].join(',')
  })
  const csv = [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `comparacion-${detailA.slug}-vs-${detailB.slug}-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function SkillMiniRow({ skill, sources }: { skill: SkillConvergencia; sources: BenchmarkSource[] }) {
  return (
    <div className="flex items-center gap-2 py-1 border-b border-slate-50 last:border-0">
      <span className="text-xs text-slate-700 flex-1 leading-tight">{skill.skill_nombre}</span>
      <div className="flex gap-1">
        {sources.map(s => (
          <ConvergenceIcon key={s.id} direction={(skill.convergencia_por_fuente[s.id] ?? 'sin_datos') as ConvergenceDirection} />
        ))}
      </div>
      <ConvergenceIcon direction={skill.direccion_global as ConvergenceDirection} />
    </div>
  )
}

function CareerPanel({
  detail,
  sources,
  summary,
  onClear,
}: {
  detail: BenchmarkCareerDetail
  sources: BenchmarkSource[]
  summary?: BenchmarkCareerSummary | null
  onClear: () => void
}) {
  const declining = detail.skills.filter(s => s.direccion_global === 'declining')
  const growing = detail.skills.filter(s => s.direccion_global === 'growing')
  const mixed = detail.skills.filter(s => ['mixed', 'stable'].includes(s.direccion_global))

  return (
    <div>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">{detail.nombre}</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">{detail.area}</p>
        </div>
        <div className="flex items-center gap-2 ml-3">
          {summary && (() => {
            const s = summary.urgencia_curricular
            const cls = s >= 60 ? 'bg-red-50 text-red-700 border-red-200'
              : s >= 30 ? 'bg-amber-50 text-amber-700 border-amber-200'
              : 'bg-green-50 text-green-700 border-green-200'
            return (
              <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-[10px] font-semibold ${cls}`}
                title="Urgencia curricular (0–100)">
                U<span className="font-mono">{s}</span>
              </span>
            )
          })()}
          <button onClick={onClear} className="text-[11px] text-slate-400 hover:text-slate-600">×</button>
        </div>
      </div>

      <div className="flex gap-3 mb-4 text-xs">
        <span className="text-red-600 font-semibold">{declining.length} declining</span>
        <span className="text-emerald-600 font-semibold">{growing.length} growing</span>
        <span className="text-yellow-600 font-semibold">{mixed.length} mixed</span>
      </div>

      <div className="space-y-0">
        {[...detail.skills].sort((a, b) => DIR_ORDER[a.direccion_global] - DIR_ORDER[b.direccion_global])
          .map(skill => <SkillMiniRow key={skill.skill_id} skill={skill} sources={sources} />)}
      </div>

      <div className="mt-3">
        <Link href={`/benchmarks/${detail.slug}`} className="text-xs text-brand-600 hover:underline font-medium">
          Ver benchmark completo →
        </Link>
      </div>
    </div>
  )
}

export default function BenchmarksCompararPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [careers, setCareers] = useState<BenchmarkCareerSummary[]>([])
  const [sources, setSources] = useState<BenchmarkSource[]>([])
  const [slugA, setSlugAState] = useState<string>(() => searchParams.get('a') ?? '')
  const [slugB, setSlugBState] = useState<string>(() => searchParams.get('b') ?? '')
  const [detailA, setDetailA] = useState<BenchmarkCareerDetail | null>(null)
  const [detailB, setDetailB] = useState<BenchmarkCareerDetail | null>(null)
  const [loadingA, setLoadingA] = useState(false)
  const [loadingB, setLoadingB] = useState(false)

  const updateParams = useCallback((a: string, b: string) => {
    const params = new URLSearchParams()
    if (a) params.set('a', a)
    if (b) params.set('b', b)
    const qs = params.toString()
    router.replace(qs ? `?${qs}` : '?', { scroll: false })
  }, [router])

  const setSlugA = (v: string) => { setSlugAState(v); updateParams(v, slugB) }
  const setSlugB = (v: string) => { setSlugBState(v); updateParams(slugA, v) }

  useEffect(() => {
    Promise.all([getBenchmarkCareers(), getBenchmarkSources()])
      .then(([c, s]) => { setCareers(c); setSources(s) })
  }, [])

  useEffect(() => {
    if (!slugA) { setDetailA(null); return }
    setLoadingA(true)
    getBenchmarkCareerDetail(slugA).then(setDetailA).catch(() => setDetailA(null)).finally(() => setLoadingA(false))
  }, [slugA])

  useEffect(() => {
    if (!slugB) { setDetailB(null); return }
    setLoadingB(true)
    getBenchmarkCareerDetail(slugB).then(setDetailB).catch(() => setDetailB(null)).finally(() => setLoadingB(false))
  }, [slugB])

  const careersMap = useMemo(
    () => Object.fromEntries(careers.map(c => [c.slug, c])),
    [careers]
  )

  const divergencias = useMemo(() => {
    if (!detailA || !detailB) return []
    const mapA = Object.fromEntries(detailA.skills.map(s => [s.skill_id, s]))
    const mapB = Object.fromEntries(detailB.skills.map(s => [s.skill_id, s]))
    const shared = Object.keys(mapA).filter(id => id in mapB)
    return shared
      .filter(id => mapA[id].direccion_global !== mapB[id].direccion_global)
      .map(id => ({ id, skillA: mapA[id], skillB: mapB[id] }))
  }, [detailA, detailB])

  const sharedCount = useMemo(() => {
    if (!detailA || !detailB) return 0
    const idsA = new Set(detailA.skills.map(s => s.skill_id))
    return detailB.skills.filter(s => idsA.has(s.skill_id)).length
  }, [detailA, detailB])

  const uniqueA = useMemo(() => {
    if (!detailA || !detailB) return []
    const idsB = new Set(detailB.skills.map(s => s.skill_id))
    return detailA.skills.filter(s => !idsB.has(s.skill_id))
  }, [detailA, detailB])

  const uniqueB = useMemo(() => {
    if (!detailA || !detailB) return []
    const idsA = new Set(detailA.skills.map(s => s.skill_id))
    return detailB.skills.filter(s => !idsA.has(s.skill_id))
  }, [detailA, detailB])

  const alignmentPct = useMemo(() => {
    if (!sharedCount) return null
    return Math.round(((sharedCount - divergencias.length) / sharedCount) * 100)
  }, [sharedCount, divergencias])

  const selectClass = 'w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700'

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <Link href="/benchmarks" className="text-xs text-brand-600 hover:underline">← Benchmarks Globales</Link>
        <div className="mt-2 flex items-start justify-between gap-3">
          <SectionHeader
            title="Comparar carreras"
            subtitle="Selecciona dos carreras para comparar sus perfiles de skills ante la IA"
          />
          {detailA && detailB && sources.length > 0 && (
            <button
              onClick={() => exportComparacion(detailA, detailB, sources)}
              className="shrink-0 text-xs text-slate-600 border border-slate-200 px-3 py-1.5 rounded hover:bg-slate-50 transition-colors font-medium mt-1"
            >
              ↓ CSV
            </button>
          )}
        </div>
      </div>

      {/* Selectors */}
      <Card className="mb-6 p-5">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Carrera A</label>
            <select value={slugA} onChange={e => setSlugA(e.target.value)} className={selectClass}>
              <option value="">Selecciona una carrera…</option>
              {careers.filter(c => c.slug !== slugB).map(c => (
                <option key={c.slug} value={c.slug}>{c.nombre} (U{c.urgencia_curricular})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Carrera B</label>
            <select value={slugB} onChange={e => setSlugB(e.target.value)} className={selectClass}>
              <option value="">Selecciona una carrera…</option>
              {careers.filter(c => c.slug !== slugA).map(c => (
                <option key={c.slug} value={c.slug}>{c.nombre} (U{c.urgencia_curricular})</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Panels */}
      {(detailA || detailB || loadingA || loadingB) && (
        <div className="grid grid-cols-2 gap-6 mb-6">
          <Card className="p-4">
            {loadingA
              ? <p className="text-xs text-slate-400 text-center py-4">Cargando...</p>
              : detailA
              ? <CareerPanel detail={detailA} sources={sources} summary={careersMap[slugA]} onClear={() => setSlugA('')} />
              : <p className="text-xs text-slate-400 text-center py-4">Selecciona la Carrera A</p>
            }
          </Card>
          <Card className="p-4">
            {loadingB
              ? <p className="text-xs text-slate-400 text-center py-4">Cargando...</p>
              : detailB
              ? <CareerPanel detail={detailB} sources={sources} summary={careersMap[slugB]} onClear={() => setSlugB('')} />
              : <p className="text-xs text-slate-400 text-center py-4">Selecciona la Carrera B</p>
            }
          </Card>
        </div>
      )}

      {/* Divergencias */}
      {detailA && detailB && (
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-0.5">
                  Análisis de convergencia cruzada
                </h3>
                <p className="text-xs text-slate-400">
                  {sharedCount} skills en común · {divergencias.length} con dirección diferente entre ambas carreras
                </p>
              </div>
              {alignmentPct !== null && (
                <div className="shrink-0 text-center ml-4">
                  <p className={`text-2xl font-bold font-mono ${alignmentPct >= 75 ? 'text-emerald-600' : alignmentPct >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {alignmentPct}%
                  </p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest">alineación</p>
                </div>
              )}
            </div>
            {alignmentPct !== null && (
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-4">
                <div
                  className={`h-full rounded-full transition-all ${alignmentPct >= 75 ? 'bg-emerald-400' : alignmentPct >= 50 ? 'bg-yellow-400' : 'bg-red-400'}`}
                  style={{ width: `${alignmentPct}%` }}
                />
              </div>
            )}
            {divergencias.length === 0 ? (
              <p className="text-xs text-emerald-600 font-medium">
                Ambas carreras comparten la misma dirección en todas sus skills en común.
              </p>
            ) : (
              <div className="space-y-2">
                {divergencias.map(({ id, skillA, skillB }) => (
                  <div key={id} className="flex items-center gap-3 p-2 rounded-lg bg-amber-50 border border-amber-100">
                    <Link href={`/benchmarks/skills/${id}`}
                      className="text-xs font-medium text-slate-700 flex-1 hover:underline text-brand-700">
                      {skillA.skill_nombre}
                    </Link>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-500">{detailA.nombre.split('/')[0].trim()}:</span>
                      <ConvergenceIcon direction={skillA.direccion_global as ConvergenceDirection} />
                    </div>
                    <span className="text-slate-300">vs</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-500">{detailB.nombre.split('/')[0].trim()}:</span>
                      <ConvergenceIcon direction={skillB.direccion_global as ConvergenceDirection} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {(uniqueA.length > 0 || uniqueB.length > 0) && (
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-3">Skills exclusivas por carrera</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-semibold text-slate-600 mb-2">
                    Solo en {detailA.nombre.split('/')[0].trim()} <span className="font-normal text-slate-400">({uniqueA.length})</span>
                  </p>
                  <div className="space-y-1">
                    {uniqueA.slice(0, 8).map(s => (
                      <div key={s.skill_id} className="flex items-center gap-2">
                        <ConvergenceIcon direction={s.direccion_global as ConvergenceDirection} />
                        <Link href={`/benchmarks/skills/${s.skill_id}`}
                          className="text-xs text-slate-600 hover:text-brand-700 hover:underline truncate">{s.skill_nombre}</Link>
                      </div>
                    ))}
                    {uniqueA.length > 8 && <p className="text-[11px] text-slate-400">+{uniqueA.length - 8} más</p>}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-600 mb-2">
                    Solo en {detailB.nombre.split('/')[0].trim()} <span className="font-normal text-slate-400">({uniqueB.length})</span>
                  </p>
                  <div className="space-y-1">
                    {uniqueB.slice(0, 8).map(s => (
                      <div key={s.skill_id} className="flex items-center gap-2">
                        <ConvergenceIcon direction={s.direccion_global as ConvergenceDirection} />
                        <Link href={`/benchmarks/skills/${s.skill_id}`}
                          className="text-xs text-slate-600 hover:text-brand-700 hover:underline truncate">{s.skill_nombre}</Link>
                      </div>
                    ))}
                    {uniqueB.length > 8 && <p className="text-[11px] text-slate-400">+{uniqueB.length - 8} más</p>}
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {!detailA && !detailB && !loadingA && !loadingB && (
        <p className="text-xs text-slate-400 text-center py-8">
          Selecciona dos carreras para ver la comparación de sus perfiles de skills.
        </p>
      )}
    </div>
  )
}

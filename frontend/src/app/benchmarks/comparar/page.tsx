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
  onClear,
}: {
  detail: BenchmarkCareerDetail
  sources: BenchmarkSource[]
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
        <button onClick={onClear} className="text-[11px] text-slate-400 hover:text-slate-600 ml-3">×</button>
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

  const selectClass = 'w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700'

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <Link href="/benchmarks" className="text-xs text-brand-600 hover:underline">← Benchmarks Globales</Link>
        <div className="mt-2">
          <SectionHeader
            title="Comparar carreras"
            subtitle="Selecciona dos carreras para comparar sus perfiles de skills ante la IA"
          />
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
                <option key={c.slug} value={c.slug}>{c.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Carrera B</label>
            <select value={slugB} onChange={e => setSlugB(e.target.value)} className={selectClass}>
              <option value="">Selecciona una carrera…</option>
              {careers.filter(c => c.slug !== slugA).map(c => (
                <option key={c.slug} value={c.slug}>{c.nombre}</option>
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
              ? <CareerPanel detail={detailA} sources={sources} onClear={() => setSlugA('')} />
              : <p className="text-xs text-slate-400 text-center py-4">Selecciona la Carrera A</p>
            }
          </Card>
          <Card className="p-4">
            {loadingB
              ? <p className="text-xs text-slate-400 text-center py-4">Cargando...</p>
              : detailB
              ? <CareerPanel detail={detailB} sources={sources} onClear={() => setSlugB('')} />
              : <p className="text-xs text-slate-400 text-center py-4">Selecciona la Carrera B</p>
            }
          </Card>
        </div>
      )}

      {/* Divergencias */}
      {detailA && detailB && (
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-1">
              Análisis de convergencia cruzada
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              {sharedCount} skills en común · {divergencias.length} con dirección diferente entre ambas carreras
            </p>
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

// frontend/src/app/benchmarks/skills/[skill_id]/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useMemo } from 'react'
import { getBenchmarkSkillCrossSource, getBenchmarkSkillsIndex, getBenchmarkSkillCareers } from '@/lib/api'
import type { SkillCrossSource, SkillIndexItem, SkillCareerItem, ConvergenceDirection } from '@/lib/types'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import ConvergenceIcon from '@/components/benchmarks/ConvergenceIcon'

const DIR_VARIANT: Record<string, 'risk' | 'oportunidad' | 'neutro'> = {
  declining: 'risk',
  growing: 'oportunidad',
  mixed: 'neutro',
  stable: 'neutro',
  sin_datos: 'neutro',
}

const DIR_LABEL: Record<string, string> = {
  declining: 'Declining',
  growing: 'Growing',
  mixed: 'Mixed',
  stable: 'Stable',
  sin_datos: 'Sin datos',
}

const HORIZONTE_LABEL: Record<string, string> = {
  corto: 'Corto plazo (≤2 años)',
  mediano: 'Mediano plazo (3–5 años)',
  largo: 'Largo plazo (>5 años)',
}

export default function SkillCrossSourcePage() {
  const { skill_id } = useParams<{ skill_id: string }>()
  const searchParams = useSearchParams()
  const backSlug = searchParams.get('from')
  const skillNombreParam = searchParams.get('nombre')

  const [cross, setCross] = useState<SkillCrossSource | null>(null)
  const [indexItem, setIndexItem] = useState<SkillIndexItem | null>(null)
  const [skillCareers, setSkillCareers] = useState<SkillCareerItem[]>([])
  const [allIndex, setAllIndex] = useState<SkillIndexItem[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!skill_id) return
    Promise.all([
      getBenchmarkSkillCrossSource(skill_id),
      getBenchmarkSkillsIndex(),
      getBenchmarkSkillCareers(skill_id),
    ])
      .then(([c, idx, sc]) => {
        setCross(c)
        setIndexItem(idx.find(s => s.skill_id === skill_id) ?? null)
        setSkillCareers(sc)
        setAllIndex(idx)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [skill_id])

  const relatedSkills = useMemo(() => {
    if (!indexItem || allIndex.length === 0) return []
    const myCarrerasSet = new Set(indexItem.carreras)
    return allIndex
      .filter(s => s.skill_id !== skill_id)
      .map(s => ({ ...s, sharedCount: s.carreras.filter(c => myCarrerasSet.has(c)).length }))
      .filter(s => s.sharedCount > 0)
      .sort((a, b) => b.sharedCount - a.sharedCount || b.consenso_pct - a.consenso_pct)
      .slice(0, 8)
  }, [indexItem, allIndex, skill_id])

  if (loading) return <p className="text-slate-400 text-sm py-8 text-center">Cargando...</p>

  if (notFound || !cross) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500 text-sm mb-4">Skill no encontrada.</p>
        <Link href="/benchmarks/skills" className="text-brand-600 text-sm hover:underline">← Índice de skills</Link>
      </div>
    )
  }

  const nombre = indexItem?.skill_nombre ?? skillNombreParam ?? skill_id
  const tipo = indexItem?.skill_tipo
  const direccion = (indexItem?.direccion_global ?? 'sin_datos') as ConvergenceDirection
  const fuentes = indexItem?.fuentes_con_datos ?? 0
  const consenso = indexItem?.consenso_pct ?? 0
  const backCareerName = skillCareers.find(c => c.career_slug === backSlug)?.career_nombre ?? backSlug

  return (
    <div className="max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <div className="mb-5 flex items-center gap-1.5 text-xs text-slate-400 flex-wrap">
        <Link href="/benchmarks" className="text-brand-600 hover:underline">Benchmarks</Link>
        <span>/</span>
        {backSlug ? (
          <>
            <Link href={`/benchmarks/${backSlug}`} className="text-brand-600 hover:underline">
              {backCareerName}
            </Link>
            <span>/</span>
          </>
        ) : (
          <>
            <Link href="/benchmarks/skills" className="text-brand-600 hover:underline">Skills</Link>
            <span>/</span>
          </>
        )}
        <span className="text-slate-600 truncate max-w-[200px]">{nombre}</span>
      </div>

      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-slate-900">{nombre}</h1>
        {tipo && <p className="text-sm text-slate-500 mt-0.5 capitalize">{tipo}</p>}
      </div>

      {/* Stats */}
      <Card className="mb-5 p-4">
        <div className="flex items-center gap-8 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500 uppercase tracking-widest">Dirección global</span>
            <ConvergenceIcon direction={direccion} />
            <Badge variant={DIR_VARIANT[direccion] ?? 'neutro'}>
              {DIR_LABEL[direccion] ?? direccion}
            </Badge>
          </div>
          <div>
            <span className="text-[11px] text-slate-500 uppercase tracking-widest block mb-0.5">Fuentes con datos</span>
            <span className="text-xl font-bold font-mono text-slate-800">
              {fuentes}<span className="text-xs text-slate-400 font-normal">/5</span>
            </span>
          </div>
          <div>
            <span className="text-[11px] text-slate-500 uppercase tracking-widest block mb-0.5">Consenso</span>
            <span className="text-xl font-bold font-mono text-slate-800">
              {fuentes > 0 ? `${consenso}%` : '—'}
            </span>
          </div>
        </div>
      </Card>

      {/* Hallazgos */}
      <h2 className="text-sm font-semibold text-slate-700 mb-3">
        Hallazgos por fuente
        <span className="ml-2 text-[11px] font-normal text-slate-400">
          ({cross.hallazgos.length} fuente{cross.hallazgos.length !== 1 ? 's' : ''} con datos)
        </span>
      </h2>

      {cross.hallazgos.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-slate-400 text-sm">Esta habilidad no tiene cobertura en las fuentes actuales.</p>
        </Card>
      ) : (
        <div className="space-y-4 mb-6">
          {cross.hallazgos.map(h => (
            <Card key={h.fuente_id} className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">{h.fuente_nombre}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {HORIZONTE_LABEL[h.horizonte_impacto] ?? h.horizonte_impacto}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <ConvergenceIcon direction={h.direccion as ConvergenceDirection} />
                  <Badge variant={DIR_VARIANT[h.direccion] ?? 'neutro'}>
                    {DIR_LABEL[h.direccion] ?? h.direccion}
                  </Badge>
                </div>
              </div>

              <p className="text-sm text-slate-700 leading-relaxed mb-3">{h.hallazgo}</p>

              {h.dato_clave && (
                <div className="bg-slate-50 rounded-md p-3 mb-3">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mb-1">Dato clave</p>
                  <p className="text-sm font-semibold text-slate-800">{h.dato_clave}</p>
                </div>
              )}

              {h.cita_textual && (
                <blockquote className="border-l-2 border-brand-300 pl-3 text-xs text-slate-500 italic leading-relaxed">
                  "{h.cita_textual}"
                </blockquote>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Carreras */}
      {skillCareers.length > 0 && (
        <Card className="mt-6 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">
            Carreras que incluyen esta habilidad
            <span className="ml-2 text-[11px] font-normal text-slate-400">({skillCareers.length})</span>
          </h2>
          <div className="divide-y divide-slate-50">
            {skillCareers.map(c => (
              <div key={c.career_slug} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
                <ConvergenceIcon direction={c.direccion as ConvergenceDirection} />
                <Link
                  href={`/benchmarks/${c.career_slug}${backSlug ? '' : `?from=${skill_id}`}`}
                  className="flex-1 text-sm text-slate-700 hover:text-brand-700 hover:underline"
                >
                  {c.career_nombre}
                </Link>
                <span className="text-[11px] text-slate-400 hidden sm:block">{c.area}</span>
                <span className={`text-[11px] font-mono font-semibold ${c.urgencia_curricular >= 50 ? 'text-red-500' : c.urgencia_curricular >= 25 ? 'text-yellow-600' : 'text-emerald-600'}`}>
                  {c.urgencia_curricular}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-300 mt-3">Número = urgencia curricular de la carrera (0–100)</p>
        </Card>
      )}

      {/* Related skills */}
      {relatedSkills.length > 0 && (
        <Card className="mt-6 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">
            Habilidades relacionadas
            <span className="ml-2 text-[11px] font-normal text-slate-400">(comparten carreras)</span>
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {relatedSkills.map(s => (
              <Link
                key={s.skill_id}
                href={`/benchmarks/skills/${s.skill_id}`}
                className="flex items-center gap-2 p-2 rounded-lg border border-slate-100 hover:border-brand-200 hover:bg-brand-50/30 transition-colors"
              >
                <ConvergenceIcon direction={s.direccion_global as ConvergenceDirection} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-700 truncate leading-tight">{s.skill_nombre}</p>
                  <p className="text-[10px] text-slate-400">{s.sharedCount} carrera{s.sharedCount !== 1 ? 's' : ''} en común</p>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

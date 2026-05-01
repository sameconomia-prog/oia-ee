'use client'
import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { getVacanteDetalle, getBenchmarkSkillsIndex } from '@/lib/api'
import type { VacantePublico, SkillIndexItem } from '@/lib/types'

function norm(s: string) {
  return s.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function matchSkill(label: string, index: SkillIndexItem[]): SkillIndexItem | undefined {
  const q = norm(label)
  return (
    index.find(item => norm(item.skill_nombre) === q) ??
    index.find(item => norm(item.skill_nombre).includes(q) || q.includes(norm(item.skill_nombre)))
  )
}

const DIR_CONFIG: Record<string, { icon: string; cls: string; label: string }> = {
  growing:   { icon: '↑', cls: 'text-emerald-600', label: 'creciendo' },
  declining: { icon: '↓', cls: 'text-red-500',     label: 'declinando' },
  mixed:     { icon: '~', cls: 'text-amber-500',    label: 'mixto' },
  stable:    { icon: '→', cls: 'text-slate-400',    label: 'estable' },
}

export default function VacanteDetallePage() {
  const { id } = useParams<{ id: string }>()
  const [vacante, setVacante] = useState<VacantePublico | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [skillsIndex, setSkillsIndex] = useState<SkillIndexItem[]>([])

  useEffect(() => {
    if (!id) return
    Promise.all([
      getVacanteDetalle(id),
      getBenchmarkSkillsIndex().catch(() => [] as SkillIndexItem[]),
    ]).then(([v, idx]) => {
      setVacante(v)
      setSkillsIndex(idx)
    }).catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  const skillSignals = useMemo(() => {
    if (!vacante || skillsIndex.length === 0) return new Map<string, SkillIndexItem>()
    const map = new Map<string, SkillIndexItem>()
    for (const s of vacante.skills) {
      const match = matchSkill(s, skillsIndex)
      if (match) map.set(s, match)
    }
    return map
  }, [vacante, skillsIndex])

  if (loading) return <p className="text-gray-400 text-sm py-8 text-center">Cargando...</p>

  if (notFound || !vacante) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 text-sm mb-4">Vacante no encontrada.</p>
        <Link href="/vacantes" className="text-indigo-600 text-sm hover:underline">← Ver vacantes</Link>
      </div>
    )
  }

  const v = vacante

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/vacantes" className="text-xs text-indigo-600 hover:underline">← Vacantes</Link>
        <div className="flex items-start gap-2 mt-3 flex-wrap">
          {v.sector && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-medium">{v.sector}</span>
          )}
          {v.estado && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{v.estado}</span>
          )}
        </div>
        <h1 className="text-xl font-bold text-gray-900 mt-2 leading-tight">{v.titulo}</h1>
        {v.empresa && <p className="text-sm text-gray-600 mt-0.5">{v.empresa}</p>}
        {v.fecha_pub && (
          <p className="text-xs text-gray-400 mt-1">{new Date(v.fecha_pub).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
        )}
      </div>

      <div className="bg-white rounded-xl border shadow-sm p-5 mb-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Detalles</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {v.nivel_educativo && (
            <div>
              <p className="text-xs text-gray-400">Nivel educativo</p>
              <p className="font-medium text-gray-700">{v.nivel_educativo}</p>
            </div>
          )}
          {v.experiencia_anios != null && (
            <div>
              <p className="text-xs text-gray-400">Experiencia</p>
              <p className="font-medium text-gray-700">{v.experiencia_anios} {v.experiencia_anios === 1 ? 'año' : 'años'}</p>
            </div>
          )}
          {(v.salario_min != null || v.salario_max != null) && (
            <div className="col-span-2">
              <p className="text-xs text-gray-400">Salario mensual</p>
              <p className="font-medium text-gray-700">
                {v.salario_min != null ? `$${v.salario_min.toLocaleString()}` : '—'}
                {v.salario_max != null ? ` – $${v.salario_max.toLocaleString()}` : ''}
              </p>
            </div>
          )}
        </div>
      </div>

      {v.skills.length > 0 && (
        <div className="bg-white rounded-xl border shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Skills requeridas</h2>
            {skillSignals.size > 0 && (() => {
              const vals = Array.from(skillSignals.values())
              const growing = vals.filter(s => s.direccion_global === 'growing').length
              const declining = vals.filter(s => s.direccion_global === 'declining').length
              return (
                <span className="text-[11px] text-gray-400">
                  {growing > 0 && <span className="text-emerald-600 font-medium">{growing} ↑</span>}
                  {growing > 0 && declining > 0 && <span className="mx-1">·</span>}
                  {declining > 0 && <span className="text-red-500 font-medium">{declining} ↓</span>}
                  <span className="ml-1">según benchmarks</span>
                </span>
              )
            })()}
          </div>
          <div className="flex flex-wrap gap-2">
            {v.skills.map(s => {
              const signal = skillSignals.get(s)
              const cfg = signal ? DIR_CONFIG[signal.direccion_global] : null
              return cfg ? (
                <Link
                  key={s}
                  href={`/benchmarks/skills/${signal!.skill_id}`}
                  title={`${signal!.skill_nombre} — ${cfg.label} (${signal!.consenso_pct}% consenso)`}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium hover:bg-indigo-100 transition-colors"
                >
                  {s}
                  <span className={`${cfg.cls} font-bold text-[11px]`}>{cfg.icon}</span>
                </Link>
              ) : (
                <span key={s} className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium">{s}</span>
              )
            })}
          </div>
          {skillSignals.size > 0 && (
            <p className="text-[10px] text-gray-400 mt-3">
              ↑ creciendo · ↓ declinando · ~ mixto · según benchmarks internacionales WEF/McKinsey/CEPAL.{' '}
              <Link href="/benchmarks/skills" className="text-indigo-500 hover:underline">Ver índice de skills →</Link>
            </p>
          )}
        </div>
      )}
    </div>
  )
}

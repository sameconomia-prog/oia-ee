// frontend/src/app/benchmarks/skills/[skill_id]/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getBenchmarkSkillCrossSource } from '@/lib/api'
import type { SkillCrossSource, ConvergenceDirection } from '@/lib/types'
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
  corto: 'Corto plazo (< 3 años)',
  medio: 'Medio plazo (3–7 años)',
  largo: 'Largo plazo (> 7 años)',
}

export default function SkillCrossSourcePage() {
  const { skill_id } = useParams<{ skill_id: string }>()
  const searchParams = useSearchParams()
  const backSlug = searchParams.get('from')
  const skillNombre = searchParams.get('nombre')

  const [data, setData] = useState<SkillCrossSource | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!skill_id) return
    getBenchmarkSkillCrossSource(skill_id)
      .then(setData)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [skill_id])

  if (loading) return <p className="text-slate-400 text-sm py-8 text-center">Cargando...</p>

  if (notFound || !data) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500 text-sm mb-4">Skill no encontrada.</p>
        <Link href="/benchmarks" className="text-brand-600 text-sm hover:underline">← Benchmarks globales</Link>
      </div>
    )
  }

  const backHref = backSlug ? `/benchmarks/${backSlug}` : '/benchmarks'

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Link href={backHref} className="text-xs text-brand-600 hover:underline">← {backSlug ? `Benchmarks: ${backSlug}` : 'Benchmarks Globales'}</Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">
          {skillNombre ?? skill_id}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {data.hallazgos.length} fuente{data.hallazgos.length !== 1 ? 's' : ''} con datos para esta habilidad
        </p>
      </div>

      {data.hallazgos.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-slate-400 text-sm">Esta habilidad no tiene cobertura en las fuentes actuales.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {data.hallazgos.map(h => (
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

              <div className="bg-slate-50 rounded-md p-3 mb-3">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mb-1">Dato clave</p>
                <p className="text-sm font-semibold text-slate-800">{h.dato_clave}</p>
              </div>

              {h.cita_textual && (
                <blockquote className="border-l-2 border-brand-300 pl-3 text-xs text-slate-500 italic leading-relaxed">
                  "{h.cita_textual}"
                </blockquote>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

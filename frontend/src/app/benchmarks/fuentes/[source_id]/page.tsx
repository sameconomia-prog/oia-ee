// frontend/src/app/benchmarks/fuentes/[source_id]/page.tsx
'use client'
import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { getBenchmarkSourceDetail } from '@/lib/api'
import type { SourceDetail, SourceHallazgo, ConvergenceDirection } from '@/lib/types'
import ConvergenceIcon from '@/components/benchmarks/ConvergenceIcon'
import Card from '@/components/ui/Card'

const MET_LABEL: Record<string, string> = {
  encuesta_empleadores: 'Encuesta empleadores',
  analisis_tareas: 'Análisis de tareas',
  uso_observado: 'Uso observado en IA',
  modelado_economico: 'Modelado econométrico',
  revision_literatura: 'Revisión literatura + ML',
}

const DIR_ORDER: Record<string, number> = { declining: 0, mixed: 1, stable: 1, growing: 2, sin_datos: 3 }

function HallazgoRow({ h }: { h: SourceHallazgo }) {
  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
      <td className="px-4 py-3 align-top">
        <Link href={`/benchmarks/${h.career_slug}`}
          className="text-xs text-brand-600 hover:underline font-medium">
          {h.career_nombre.split('/')[0].trim()}
        </Link>
      </td>
      <td className="px-4 py-3 align-top">
        <Link href={`/benchmarks/skills/${h.skill_id}`}
          className="text-xs font-medium text-slate-700 hover:underline">
          {h.skill_nombre}
        </Link>
        <p className="text-[10px] text-slate-400 capitalize mt-0.5">{h.skill_tipo}</p>
      </td>
      <td className="px-3 py-3 text-center align-top">
        <ConvergenceIcon direction={h.direccion as ConvergenceDirection} />
      </td>
      <td className="px-4 py-3 align-top">
        <p className="text-xs text-slate-700 leading-relaxed">{h.hallazgo}</p>
        {h.dato_clave && (
          <p className="text-[11px] font-semibold text-slate-500 mt-1">{h.dato_clave}</p>
        )}
        {h.cita_textual && (
          <p className="text-[10px] text-slate-400 italic mt-0.5">"{h.cita_textual}"</p>
        )}
      </td>
    </tr>
  )
}

export default function SourceDetailPage() {
  const { source_id } = useParams<{ source_id: string }>()
  const [detail, setDetail] = useState<SourceDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [filterDir, setFilterDir] = useState<string>('all')
  const [filterCareer, setFilterCareer] = useState<string>('all')

  useEffect(() => {
    if (!source_id) return
    getBenchmarkSourceDetail(source_id)
      .then(setDetail)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [source_id])

  const careers = useMemo(() => {
    if (!detail) return []
    return Array.from(new Set(detail.hallazgos.map(h => h.career_slug)))
      .map(slug => ({ slug, nombre: detail.hallazgos.find(h => h.career_slug === slug)!.career_nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  }, [detail])

  const filtered = useMemo(() => {
    if (!detail) return []
    let list = [...detail.hallazgos]
    if (filterDir !== 'all') list = list.filter(h => h.direccion === filterDir)
    if (filterCareer !== 'all') list = list.filter(h => h.career_slug === filterCareer)
    return list.sort((a, b) => DIR_ORDER[a.direccion] - DIR_ORDER[b.direccion] || a.career_nombre.localeCompare(b.career_nombre, 'es'))
  }, [detail, filterDir, filterCareer])

  if (loading) return <p className="text-slate-400 text-sm py-8 text-center">Cargando fuente...</p>

  if (notFound || !detail) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500 text-sm mb-4">Fuente no encontrada.</p>
        <Link href="/benchmarks" className="text-brand-600 text-sm hover:underline">← Benchmarks Globales</Link>
      </div>
    )
  }

  const btnBase = 'text-[11px] px-2.5 py-1 rounded-full border transition-colors whitespace-nowrap'
  const btnActive = 'bg-brand-600 text-white border-brand-600'
  const btnInactive = 'bg-white text-slate-600 border-slate-200 hover:border-brand-400'

  const decCt = detail.hallazgos.filter(h => h.direccion === 'declining').length
  const groCt = detail.hallazgos.filter(h => h.direccion === 'growing').length
  const mixCt = detail.hallazgos.filter(h => ['mixed', 'stable'].includes(h.direccion)).length

  return (
    <div className="max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="mb-5 flex items-center gap-1.5 text-xs text-slate-400">
        <Link href="/benchmarks" className="text-brand-600 hover:underline">Benchmarks</Link>
        <span>/</span>
        <span className="text-slate-600">{detail.nombre.split('—')[0].trim()}</span>
      </div>

      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900">{detail.nombre}</h1>
        <p className="text-sm text-slate-500 mt-1">{detail.año} · {MET_LABEL[detail.metodologia] ?? detail.metodologia}</p>
      </div>

      {/* Meta card */}
      <Card className="mb-5 p-4">
        <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-0.5">Hallazgos</p>
            <p className="text-xl font-bold font-mono text-slate-800">{detail.total_hallazgos}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-0.5">Carreras</p>
            <p className="text-xl font-bold font-mono text-slate-800">{careers.length}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-0.5">Confianza</p>
            <p className="text-sm font-semibold capitalize text-slate-700">{detail.confianza}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-0.5">Cobertura</p>
            <p className="text-sm font-semibold capitalize text-slate-700">{detail.peso_geografico}</p>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-100 flex gap-6 text-xs">
          <span className="text-red-600 font-semibold">{decCt} declining</span>
          <span className="text-emerald-600 font-semibold">{groCt} growing</span>
          <span className="text-yellow-600 font-semibold">{mixCt} mixed</span>
          <a href={detail.url} target="_blank" rel="noopener noreferrer"
            className="ml-auto text-brand-600 hover:underline">Ver reporte original →</a>
        </div>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-3 items-center">
        <div className="flex gap-1.5">
          {(['all', 'declining', 'growing', 'mixed'] as const).map(d => (
            <button key={d} onClick={() => setFilterDir(d)}
              className={`${btnBase} ${filterDir === d ? btnActive : btnInactive}`}>
              {d === 'all' ? 'Todos' : d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>
        <select value={filterCareer} onChange={e => setFilterCareer(e.target.value)}
          className="ml-auto text-xs border border-slate-200 rounded px-2 py-1.5 bg-white text-slate-600">
          <option value="all">Todas las carreras</option>
          {careers.map(c => <option key={c.slug} value={c.slug}>{c.nombre.split('/')[0].trim()}</option>)}
        </select>
        <span className="text-[11px] text-slate-400">{filtered.length} hallazgo{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        <table className="min-w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-xs">
              <th className="text-left px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">Carrera</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">Habilidad</th>
              <th className="text-center px-3 py-3 font-semibold text-gray-600 whitespace-nowrap">Dirección</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Hallazgo</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((h, i) => (
              <HallazgoRow key={`${h.career_slug}-${h.skill_id}`} h={h} />
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center text-slate-400 text-xs py-8">
                  No hay hallazgos con esos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

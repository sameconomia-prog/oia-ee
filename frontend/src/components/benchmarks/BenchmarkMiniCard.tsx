'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getBenchmarkCareers } from '@/lib/api'
import type { BenchmarkCareerSummary } from '@/lib/types'

export default function BenchmarkMiniCard({ slug }: { slug: string }) {
  const [data, setData] = useState<BenchmarkCareerSummary | null>(null)

  useEffect(() => {
    getBenchmarkCareers()
      .then(list => setData(list.find(c => c.slug === slug) ?? null))
      .catch(() => {})
  }, [slug])

  if (!data) return null

  const total = data.total_skills
  const urgencia = data.urgencia_curricular
  const { urgLabel, urgColor } =
    urgencia >= 60 ? { urgLabel: 'Alta urgencia', urgColor: 'bg-red-100 text-red-800' } :
    urgencia >= 30 ? { urgLabel: 'Urgencia moderada', urgColor: 'bg-amber-100 text-amber-800' } :
    { urgLabel: 'Baja urgencia', urgColor: 'bg-green-100 text-green-800' }

  function pct(n: number) { return total > 0 ? Math.round((n / total) * 100) : 0 }

  return (
    <div className="my-6 rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Benchmark Global</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${urgColor}`}>
            {urgLabel} · {urgencia}
          </span>
        </div>
        <p className="text-sm text-slate-700 font-medium mb-2">{data.nombre} · {total} habilidades analizadas</p>
        <div className="flex gap-3 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0"></span>
            <span className="text-slate-600">{data.skills_declining} declining ({pct(data.skills_declining)}%)</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
            <span className="text-slate-600">{data.skills_growing} growing ({pct(data.skills_growing)}%)</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0"></span>
            <span className="text-slate-600">{data.skills_mixed} mixed</span>
          </span>
        </div>
      </div>
      <Link
        href={`/benchmarks/${slug}`}
        className="shrink-0 text-xs text-brand-600 border border-brand-200 px-3 py-1.5 rounded hover:bg-brand-50 transition-colors font-medium whitespace-nowrap"
      >
        Ver matriz completa →
      </Link>
    </div>
  )
}

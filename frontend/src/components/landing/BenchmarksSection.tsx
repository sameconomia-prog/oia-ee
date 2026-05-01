// frontend/src/components/landing/BenchmarksSection.tsx
import Link from 'next/link'
import type { BenchmarkResumen, BenchmarkCareerSummary } from '@/lib/types'

const SOURCES = [
  { name: 'WEF 2025', color: 'bg-blue-100 text-blue-800' },
  { name: 'McKinsey 2023', color: 'bg-purple-100 text-purple-800' },
  { name: 'Frey-Osborne 2013', color: 'bg-amber-100 text-amber-800' },
  { name: 'CEPAL 2023', color: 'bg-green-100 text-green-800' },
  { name: 'Anthropic 2025', color: 'bg-slate-100 text-slate-800' },
]

export default function BenchmarksSection({
  resumen,
  topCareers = [],
  calientesCount = 0,
  brechaCount = 0,
}: {
  resumen?: BenchmarkResumen | null
  topCareers?: BenchmarkCareerSummary[]
  calientesCount?: number
  brechaCount?: number
}) {
  const totalCareers = resumen?.total_carreras ?? 17
  const totalSources = resumen?.total_fuentes ?? 5
  const totalSkills = resumen?.total_skills ?? 88
  const declining = resumen?.skills_declining ?? 0
  const growing = resumen?.skills_growing ?? 0
  const total = (resumen?.total_skills ?? 0)
  const pctDecl = total > 0 ? Math.round((declining / total) * 100) : 0
  const pctGrow = total > 0 ? Math.round((growing / total) * 100) : 0

  return (
    <section className="py-20 bg-slate-900 text-white">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-12">
          <span className="inline-block text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-3">
            Benchmarks Globales
          </span>
          <h2 className="text-3xl font-bold text-white mb-4">
            {totalCareers} carreras analizadas con datos internacionales
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-base leading-relaxed">
            Cruzamos {totalSources} fuentes de investigación internacional para determinar si las habilidades
            que se enseñan en México están creciendo o declinando ante la IA.
          </p>
        </div>

        {/* Live stats */}
        <div className="grid grid-cols-3 gap-6 mb-8 text-center">
          <div className="bg-slate-800/60 rounded-xl p-5 border border-slate-700/50">
            <p className="text-4xl font-bold font-mono text-indigo-400">{totalCareers}</p>
            <p className="text-sm text-slate-400 mt-1">Carreras analizadas</p>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-5 border border-slate-700/50">
            <p className="text-4xl font-bold font-mono text-indigo-400">{totalSources}</p>
            <p className="text-sm text-slate-400 mt-1">Fuentes internacionales</p>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-5 border border-slate-700/50">
            <p className="text-4xl font-bold font-mono text-indigo-400">{totalSkills}</p>
            <p className="text-sm text-slate-400 mt-1">Skills evaluadas</p>
          </div>
        </div>

        {/* Intelligence highlights */}
        {(calientesCount > 0 || brechaCount > 0) && (
          <div className="grid grid-cols-2 gap-4 mb-8">
            {calientesCount > 0 && (
              <a href="/benchmarks?panel=calientes" className="group bg-emerald-900/30 border border-emerald-700/40 rounded-xl p-4 text-center hover:bg-emerald-900/50 transition-colors">
                <p className="text-3xl font-bold font-mono text-emerald-400 group-hover:scale-105 transition-transform inline-block">{calientesCount}</p>
                <p className="text-sm text-emerald-300 mt-1">Skills calientes ↑</p>
                <p className="text-[11px] text-emerald-500 mt-0.5">Creciendo globalmente y en demanda en México</p>
              </a>
            )}
            {brechaCount > 0 && (
              <a href="/benchmarks?panel=brecha" className="group bg-amber-900/30 border border-amber-700/40 rounded-xl p-4 text-center hover:bg-amber-900/50 transition-colors">
                <p className="text-3xl font-bold font-mono text-amber-400 group-hover:scale-105 transition-transform inline-block">{brechaCount}</p>
                <p className="text-sm text-amber-300 mt-1">Skills en brecha ↓</p>
                <p className="text-[11px] text-amber-500 mt-0.5">En declive global pero aún pedidas por empleadores</p>
              </a>
            )}
          </div>
        )}

        {/* Direction distribution bar */}
        {resumen && total > 0 && (
          <div className="mb-8 bg-slate-800/40 rounded-xl p-4 border border-slate-700/40">
            <p className="text-xs text-slate-400 uppercase tracking-widest mb-3 text-center">Distribución global de skills</p>
            <div className="flex h-3 rounded-full overflow-hidden gap-px mb-3">
              <div className="bg-red-500" style={{ width: `${pctDecl}%` }} title={`Declining: ${declining}`} />
              <div className="bg-emerald-500" style={{ width: `${pctGrow}%` }} title={`Growing: ${growing}`} />
              <div className="bg-yellow-500 flex-1" />
            </div>
            <div className="flex justify-center gap-6 text-xs">
              <span className="flex items-center gap-1.5 text-red-400"><span className="w-2 h-2 rounded-full bg-red-500"></span>{declining} declining ({pctDecl}%)</span>
              <span className="flex items-center gap-1.5 text-emerald-400"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>{growing} growing ({pctGrow}%)</span>
            </div>
          </div>
        )}

        {/* Top urgent careers */}
        {topCareers.length > 0 && (
          <div className="mb-8">
            <p className="text-xs text-slate-400 uppercase tracking-widest mb-3 text-center">Carreras con mayor urgencia curricular</p>
            <div className="grid grid-cols-3 gap-3">
              {topCareers.map((c, i) => (
                <Link
                  key={c.slug}
                  href={`/benchmarks/${c.slug}`}
                  className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50 hover:border-indigo-500/50 hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] text-slate-400 font-mono">#{i + 1}</span>
                    <span className={`text-sm font-bold font-mono ${c.urgencia_curricular >= 60 ? 'text-red-400' : c.urgencia_curricular >= 30 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {c.urgencia_curricular}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-white leading-tight">{c.nombre}</p>
                  <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${c.urgencia_curricular >= 60 ? 'bg-red-500' : c.urgencia_curricular >= 30 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${c.urgencia_curricular}%` }}
                    />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Sources */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {SOURCES.map(s => (
            <span key={s.name} className={`text-xs font-semibold px-3 py-1.5 rounded-full ${s.color}`}>
              {s.name}
            </span>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/benchmarks"
            className="inline-flex items-center justify-center px-6 py-3 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Ver matriz de convergencia →
          </Link>
          <Link
            href="/pertinencia"
            className="inline-flex items-center justify-center px-6 py-3 border border-slate-600 text-slate-300 text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors"
          >
            Solicitar análisis de mi carrera
          </Link>
        </div>
      </div>
    </section>
  )
}

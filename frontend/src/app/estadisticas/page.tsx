'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getEstadisticasPublicas, getKpisDistribucion, getVacantesTendencia, getNoticiasTendencia, getBenchmarkResumen, getBenchmarkCareers, getTopRiesgo, getBenchmarkSkillsIndex, getIesPublico } from '@/lib/api'
import type { EstadisticasPublicas, KpisDistribucion, VacanteTendencia, BenchmarkResumen, BenchmarkCareerSummary, TopRiesgoItem, SkillIndexItem, IesInfo } from '@/lib/types'

function StatBox({ label, value, color, href }: { label: string; value: number | string; color: string; href?: string }) {
  const inner = (
    <div className={`rounded-xl border p-5 bg-white shadow-sm ${href ? 'hover:shadow-md transition-shadow' : ''}`}>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-4xl font-bold font-mono ${color}`}>{value}</p>
    </div>
  )
  return href ? <Link href={href}>{inner}</Link> : inner
}

function DistribucionBar({ bins, colorFn }: {
  bins: KpisDistribucion['d1']
  colorFn: (rango: string) => string
}) {
  const total = bins.reduce((s, b) => s + b.count, 0)
  if (total === 0) return <p className="text-xs text-gray-400">Sin datos</p>
  return (
    <div className="space-y-2">
      {bins.map(b => (
        <div key={b.rango} className="flex items-center gap-3">
          <span className="text-xs text-gray-500 w-32 shrink-0">{b.rango}</span>
          <div className="flex-1 bg-gray-100 rounded-full h-3">
            <div
              className={`h-3 rounded-full ${colorFn(b.rango)}`}
              style={{ width: `${total > 0 ? (b.count / total) * 100 : 0}%` }}
            />
          </div>
          <span className="text-xs font-mono text-gray-600 w-8 text-right">{b.count}</span>
        </div>
      ))}
    </div>
  )
}

function MiniTendencia({ data, label, color }: { data: VacanteTendencia[]; label: string; color: string }) {
  if (data.length < 2) return null
  const maxCount = Math.max(...data.map(d => d.count), 1)
  const H = 32
  return (
    <div>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <div className="flex items-end gap-0.5 h-8">
        {data.map((d, i) => (
          <div
            key={i}
            title={`${d.mes}: ${d.count}`}
            className={`rounded-t ${color} hover:opacity-80 transition-opacity`}
            style={{ height: `${Math.max(2, (d.count / maxCount) * H)}px`, flex: 1 }}
          />
        ))}
      </div>
    </div>
  )
}

export default function EstadisticasPage() {
  const [data, setData] = useState<EstadisticasPublicas | null>(null)
  const [distribucion, setDistribucion] = useState<KpisDistribucion | null>(null)
  const [vacTendencia, setVacTendencia] = useState<VacanteTendencia[]>([])
  const [notTendencia, setNotTendencia] = useState<VacanteTendencia[]>([])
  const [benchResumen, setBenchResumen] = useState<BenchmarkResumen | null>(null)
  const [topCareers, setTopCareers] = useState<BenchmarkCareerSummary[]>([])
  const [dobleAlerta, setDobleAlerta] = useState<(TopRiesgoItem & { urgencia: number })[]>([])
  const [topCalientes, setTopCalientes] = useState<SkillIndexItem[]>([])
  const [topDeclining, setTopDeclining] = useState<SkillIndexItem[]>([])
  const [topIesRiesgo, setTopIesRiesgo] = useState<IesInfo[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getEstadisticasPublicas()
      .then(setData)
      .catch((e: Error) => setError(e.message))
    getKpisDistribucion()
      .then(setDistribucion)
      .catch(() => {})
    getVacantesTendencia(12).then(setVacTendencia).catch(() => {})
    getNoticiasTendencia(12).then(setNotTendencia).catch(() => {})
    getBenchmarkResumen().then(setBenchResumen).catch(() => {})
    getIesPublico()
      .then(list => setTopIesRiesgo(
        [...list].filter(i => i.promedio_d1 != null).sort((a, b) => (b.promedio_d1 ?? 0) - (a.promedio_d1 ?? 0)).slice(0, 5)
      )).catch(() => {})
    getBenchmarkSkillsIndex()
      .then(skills => {
        setTopCalientes(
          skills.filter(s => s.direccion_global === 'growing').sort((a, b) => b.consenso_pct - a.consenso_pct).slice(0, 8)
        )
        setTopDeclining(
          skills.filter(s => s.direccion_global === 'declining').sort((a, b) => b.consenso_pct - a.consenso_pct).slice(0, 8)
        )
      }).catch(() => {})
    Promise.all([
      getBenchmarkCareers().catch(() => [] as BenchmarkCareerSummary[]),
      getTopRiesgo(20).catch(() => [] as TopRiesgoItem[]),
    ]).then(([bmarks, topRiesgo]) => {
      setTopCareers([...bmarks].sort((a, b) => b.urgencia_curricular - a.urgencia_curricular).slice(0, 3))
      const uMap = new Map(bmarks.map(b => [b.slug, b.urgencia_curricular]))
      const alerts = topRiesgo
        .filter(c => c.d1_score >= 0.6 && c.benchmark_slug && (uMap.get(c.benchmark_slug!) ?? 0) >= 60)
        .map(c => ({ ...c, urgencia: uMap.get(c.benchmark_slug!)! }))
        .sort((a, b) => (b.d1_score + b.urgencia / 100) - (a.d1_score + a.urgencia / 100))
      setDobleAlerta(alerts)
    }).catch(() => {})
  }, [])

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Link href="/" className="text-xs text-indigo-600 hover:underline">← Inicio</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Estadísticas del Observatorio</h1>
        <p className="text-sm text-gray-500 mt-1">Resumen consolidado de datos monitoreados en tiempo real</p>
      </div>

      {error && <p className="text-red-500 text-sm mb-4">Error cargando datos: {error}</p>}
      {!data && !error && <p className="text-gray-400 text-sm py-8 text-center">Cargando...</p>}

      {data && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
            <StatBox label="Instituciones" value={data.total_ies} color="text-indigo-600" href="/ies" />
            <StatBox label="Carreras" value={data.total_carreras} color="text-indigo-600" href="/carreras" />
            <StatBox label="Vacantes IA" value={data.total_vacantes} color="text-blue-600" href="/vacantes" />
            <StatBox label="Noticias analizadas" value={data.total_noticias} color="text-gray-800" href="/noticias" />
            <StatBox
              label="Alertas activas"
              value={data.alertas_activas}
              color={data.alertas_activas > 0 ? 'text-red-500' : 'text-gray-400'}
            />
            {dobleAlerta.length > 0 && (
              <StatBox
                label="Doble alerta"
                value={dobleAlerta.length}
                color="text-red-700"
                href="/carreras?doble=1"
              />
            )}
            {distribucion && (() => {
              const count = distribucion.d2.find(b => b.rango.startsWith('Alto'))?.count ?? 0
              return count > 0 ? (
                <StatBox
                  label="Alta oportunidad D2"
                  value={count}
                  color="text-emerald-700"
                  href="/carreras?oportunidad=1"
                />
              ) : null
            })()}
          </div>

          {(vacTendencia.length > 1 || notTendencia.length > 1) && (
            <div className="bg-white rounded-xl border shadow-sm p-5 mb-6">
              <h2 className="font-semibold text-gray-800 text-sm mb-4">Tendencia mensual (últimos 12 meses)</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {vacTendencia.length > 1 && (
                  <MiniTendencia data={vacTendencia} label="Vacantes IA publicadas" color="bg-indigo-400" />
                )}
                {notTendencia.length > 1 && (
                  <MiniTendencia data={notTendencia} label="Noticias analizadas" color="bg-blue-400" />
                )}
              </div>
            </div>
          )}

          {data.top_skills.length > 0 && (
            <div className="bg-white rounded-xl border shadow-sm p-5 mb-6">
              <h2 className="font-semibold text-gray-800 text-sm mb-3">Top skills en vacantes IA</h2>
              <div className="flex flex-wrap gap-2">
                {data.top_skills.map(s => (
                  <span key={s} className="px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-sm font-medium">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {topCalientes.length > 0 && (
            <div className="bg-white rounded-xl border shadow-sm p-5 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-800 text-sm">Skills calientes globalmente</h2>
                <Link href="/benchmarks/skills?dir=growing" className="text-xs text-indigo-600 hover:underline">Ver todas →</Link>
              </div>
              <div className="flex flex-wrap gap-2">
                {topCalientes.map(s => (
                  <Link
                    key={s.skill_id}
                    href={`/benchmarks/skills/${s.skill_id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium hover:bg-emerald-100 transition-colors"
                  >
                    {s.skill_nombre}
                    <span className="text-emerald-500 text-[10px] font-mono">{s.consenso_pct}%</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {topDeclining.length > 0 && (
            <div className="bg-white rounded-xl border shadow-sm p-5 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-800 text-sm">Skills en declive global</h2>
                <Link href="/benchmarks/skills?dir=declining" className="text-xs text-indigo-600 hover:underline">Ver todas →</Link>
              </div>
              <div className="flex flex-wrap gap-2">
                {topDeclining.map(s => (
                  <Link
                    key={s.skill_id}
                    href={`/benchmarks/skills/${s.skill_id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 border border-red-200 text-red-800 text-xs font-medium hover:bg-red-100 transition-colors"
                  >
                    {s.skill_nombre}
                    <span className="text-red-400 text-[10px] font-mono">{s.consenso_pct}%</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {distribucion && (
            <div className="bg-white rounded-xl border shadow-sm p-5 mb-6">
              <h2 className="font-semibold text-gray-800 text-sm mb-4">Distribución de riesgo nacional</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">D1 Obsolescencia (riesgo por IA)</p>
                  <DistribucionBar
                    bins={distribucion.d1}
                    colorFn={r => r.startsWith('Alto') ? 'bg-red-400' : r.startsWith('Medio') ? 'bg-yellow-400' : 'bg-green-400'}
                  />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">D2 Oportunidades curriculares</p>
                  <DistribucionBar
                    bins={distribucion.d2}
                    colorFn={r => r.startsWith('Alto') ? 'bg-green-400' : r.startsWith('Medio') ? 'bg-yellow-400' : 'bg-red-400'}
                  />
                </div>
              </div>
            </div>
          )}

          {benchResumen && (
            <div className="bg-white rounded-xl border shadow-sm p-5 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-800 text-sm">Benchmarks Globales de Habilidades</h2>
                <Link href="/benchmarks" className="text-xs text-indigo-600 hover:underline">Ver detalle →</Link>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <p className="text-2xl font-bold font-mono text-slate-900">{benchResumen.total_carreras}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Carreras</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold font-mono text-slate-900">{benchResumen.total_fuentes}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Fuentes</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold font-mono text-slate-900">{benchResumen.total_skills}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Skills totales</p>
                </div>
                {benchResumen.urgencia_promedio != null && (
                  <div className="text-center">
                    <p className={`text-2xl font-bold font-mono ${benchResumen.urgencia_promedio >= 60 ? 'text-red-600' : benchResumen.urgencia_promedio >= 30 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {benchResumen.urgencia_promedio}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">Urgencia prom.</p>
                  </div>
                )}
              </div>

              {/* Stacked proportion bar */}
              {(() => {
                const total = benchResumen.skills_declining + benchResumen.skills_growing + benchResumen.skills_mixed_stable + benchResumen.skills_sin_datos
                if (total === 0) return null
                const pctD = (benchResumen.skills_declining / total) * 100
                const pctG = (benchResumen.skills_growing / total) * 100
                const pctM = (benchResumen.skills_mixed_stable / total) * 100
                return (
                  <div className="mb-4">
                    <div className="flex h-3 rounded-full overflow-hidden gap-0.5 mb-1.5">
                      <div className="bg-red-400 rounded-l-full" style={{ width: `${pctD}%` }} title={`Declining: ${benchResumen.skills_declining}`} />
                      <div className="bg-emerald-400" style={{ width: `${pctG}%` }} title={`Growing: ${benchResumen.skills_growing}`} />
                      <div className="bg-yellow-400 rounded-r-full" style={{ width: `${pctM}%` }} title={`Mixed/Stable: ${benchResumen.skills_mixed_stable}`} />
                    </div>
                    <div className="flex gap-4 text-xs">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-400 shrink-0"></span>
                        <span className="text-slate-600">{benchResumen.skills_declining} declining ({Math.round(pctD)}%)</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
                        <span className="text-slate-600">{benchResumen.skills_growing} growing ({Math.round(pctG)}%)</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-yellow-400 shrink-0"></span>
                        <span className="text-slate-600">{benchResumen.skills_mixed_stable} mixed ({Math.round(pctM)}%)</span>
                      </span>
                    </div>
                  </div>
                )
              })()}

              {/* Top 3 urgent careers */}
              {topCareers.length > 0 && (
                <div className="border-t border-slate-100 pt-3">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Carreras más urgentes</p>
                  <div className="space-y-2">
                    {topCareers.map((c, i) => (
                      <div key={c.slug} className="flex items-center gap-3">
                        <span className="text-[11px] text-slate-400 font-mono w-4">{i + 1}</span>
                        <Link href={`/benchmarks/${c.slug}`} className="flex-1 text-xs text-slate-700 hover:text-indigo-700 hover:underline truncate">
                          {c.nombre}
                        </Link>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${c.urgencia_curricular >= 60 ? 'bg-red-400' : c.urgencia_curricular >= 30 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                              style={{ width: `${c.urgencia_curricular}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-mono text-slate-500 w-5 text-right">{c.urgencia_curricular}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {topIesRiesgo.length > 0 && (
            <div className="bg-white rounded-xl border shadow-sm p-5 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-800 text-sm">Top IES por riesgo D1</h2>
                <Link href="/ies?sort=d1_desc" className="text-xs text-indigo-600 hover:underline">Ver todas →</Link>
              </div>
              <div className="space-y-2">
                {topIesRiesgo.map((ies, i) => (
                  <div key={ies.id} className="flex items-center gap-3">
                    <span className="text-[11px] text-gray-400 font-mono w-4">{i + 1}</span>
                    <Link href={`/ies/${ies.id}`} className="flex-1 text-xs text-slate-700 hover:text-indigo-700 hover:underline truncate font-medium">
                      {ies.nombre_corto ?? ies.nombre}
                    </Link>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${(ies.promedio_d1 ?? 0) >= 0.6 ? 'bg-red-400' : (ies.promedio_d1 ?? 0) >= 0.4 ? 'bg-yellow-400' : 'bg-green-400'}`}
                          style={{ width: `${(ies.promedio_d1 ?? 0) * 100}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-mono text-gray-500 w-8 text-right">{ies.promedio_d1?.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {dobleAlerta.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-3">
              <h2 className="text-sm font-bold text-red-800 mb-1">⚠ Doble alerta — riesgo local + urgencia global</h2>
              <p className="text-xs text-red-600 mb-3">Carreras con D1 ≥ 0.60 Y urgencia curricular ≥ 60 — intervención prioritaria</p>
              <div className="space-y-2">
                {dobleAlerta.map(c => (
                  <div key={c.carrera_id} className="flex items-center gap-3 bg-white rounded-lg border border-red-100 px-3 py-2">
                    <Link href={`/carreras/${c.carrera_id}`} className="flex-1 text-xs font-semibold text-slate-800 hover:text-red-700 hover:underline truncate">
                      {c.nombre}
                    </Link>
                    <span className="text-[11px] font-mono text-red-700 shrink-0">D1 {c.d1_score.toFixed(2)}</span>
                    <Link href={`/benchmarks/${c.benchmark_slug}`} className="text-[11px] font-mono text-violet-700 hover:underline shrink-0">
                      U {c.urgencia}
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {[
              { href: '/kpis', label: 'Ver rankings KPI' },
              { href: '/comparar', label: 'Comparar instituciones' },
              { href: '/benchmarks', label: 'Benchmarks Globales' },
              { href: '/pertinencia', label: 'Solicitar análisis' },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center justify-center p-4 bg-white rounded-xl border shadow-sm hover:shadow-md hover:border-indigo-300 transition-all text-sm font-medium text-gray-700"
              >
                {label} →
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

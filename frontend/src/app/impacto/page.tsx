'use client'
import { useEffect, useState } from 'react'
import { getImpacto } from '@/lib/api'
import type { ImpactoData } from '@/lib/types'

const TABS = ['Desplazamiento', 'Empleos Creados', 'Habilidades y Carreras', 'Ocupaciones ONET'] as const
type Tab = typeof TABS[number]

function pct(value: number, max: number) {
  return max > 0 ? Math.round((value / max) * 100) : 0
}

function fmt(n: number | null | undefined) {
  if (n == null) return '—'
  return n.toLocaleString('es-MX')
}

function ColorBar({ value, max, color }: { value: number; max: number; color: string }) {
  const w = pct(value, max)
  return (
    <div className="w-full bg-gray-100 rounded-full h-3">
      <div className={`h-3 rounded-full ${color}`} style={{ width: `${Math.max(w, 2)}%` }} />
    </div>
  )
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className={`rounded-xl border-l-4 bg-white shadow-sm p-5 ${color}`}>
      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function ImpactoPage() {
  const [data, setData] = useState<ImpactoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('Desplazamiento')

  useEffect(() => {
    getImpacto()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-gray-500">Cargando datos de impacto...</div>
  if (!data) return <div className="p-8 text-red-500">Error al cargar datos.</div>

  const { resumen } = data
  const maxEmpleadosSector = Math.max(...data.despidos_por_sector.map(s => s.empleados), 1)
  const maxDespidosPais = Math.max(...data.despidos_por_pais.map(p => p.noticias), 1)
  const maxVacantesSector = Math.max(...data.vacantes_por_sector.map(v => v.count), 1)
  const maxSkill = Math.max(...data.top_skills_demandados.map(s => s.count), 1)
  const maxPositivosSector = Math.max(...data.positivos_por_sector.map(s => s.noticias), 1)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mapa de Impacto IA en Empleo</h1>
        <p className="text-gray-500 text-sm mt-1">
          Análisis cuantitativo de desplazamiento laboral, empleos generados y habilidades demandadas por la inteligencia artificial.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Empleados afectados"
          value={fmt(resumen.total_empleados_afectados)}
          sub={`en ${resumen.total_noticias_despido} eventos documentados`}
          color="border-red-500"
        />
        <StatCard
          label="Noticias de desplazamiento"
          value={fmt(resumen.total_noticias_despido)}
          sub="despidos masivos y automatización"
          color="border-orange-400"
        />
        <StatCard
          label="Señales de oportunidad"
          value={fmt(resumen.total_noticias_positivas)}
          sub="adopción IA, nuevas carreras, augmentación"
          color="border-emerald-500"
        />
        <StatCard
          label="Vacantes IA activas"
          value={fmt(resumen.total_vacantes_ia)}
          sub="empleos disponibles ahora"
          color="border-blue-500"
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab: Desplazamiento */}
      {tab === 'Desplazamiento' && (
        <div className="space-y-6">
          {/* Eventos reales con números */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Eventos de Desplazamiento Documentados</h2>
              <span className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded-full font-medium">
                {data.top_eventos_despido.length} eventos con cifras
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Empresa</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Empleados</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Sector</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">País</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Causa IA</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.top_eventos_despido.map(e => (
                    <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{e.empresa || '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-red-600 font-bold">{fmt(e.n_empleados)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs capitalize">{e.sector || '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{e.pais || '—'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{e.causa_ia || '—'}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{e.fecha?.slice(0, 10) || '—'}</td>
                      <td className="px-4 py-3">
                        {e.url && (
                          <a href={e.url} target="_blank" rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-xs">fuente →</a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.top_eventos_despido.length === 0 && (
                <p className="text-center text-gray-400 py-8 text-sm">No hay eventos con cifras de empleados registradas.</p>
              )}
            </div>
          </div>

          {/* Por sector y por país */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Desplazamiento por Sector</h2>
              <div className="space-y-3">
                {data.despidos_por_sector.map(s => (
                  <div key={s.sector}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 capitalize">{s.sector}</span>
                      <span className="text-gray-500">
                        <span className="text-red-600 font-semibold">{fmt(s.empleados)}</span>
                        {' '}emp · {s.noticias} noticias
                      </span>
                    </div>
                    <ColorBar value={s.empleados} max={maxEmpleadosSector} color="bg-red-400" />
                  </div>
                ))}
                {data.despidos_por_sector.length === 0 && (
                  <p className="text-gray-400 text-sm text-center py-4">Sin datos de sector</p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Desplazamiento por País</h2>
              <div className="space-y-3">
                {data.despidos_por_pais.slice(0, 10).map(p => (
                  <div key={p.pais}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{p.pais}</span>
                      <span className="text-gray-500">
                        <span className="font-semibold">{p.noticias}</span> noticias
                        {p.empleados > 0 && <span className="text-red-500 ml-1">· {fmt(p.empleados)}</span>}
                      </span>
                    </div>
                    <ColorBar value={p.noticias} max={maxDespidosPais} color="bg-orange-400" />
                  </div>
                ))}
                {data.despidos_por_pais.length === 0 && (
                  <p className="text-gray-400 text-sm text-center py-4">Sin datos de país</p>
                )}
              </div>
            </div>
          </div>

          {/* Por causa IA */}
          {data.despidos_por_causa_ia.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Tecnología IA Responsable</h2>
              <div className="flex flex-wrap gap-2">
                {data.despidos_por_causa_ia.map(c => (
                  <span key={c.causa}
                    className="bg-orange-50 border border-orange-200 text-orange-800 rounded-full px-3 py-1 text-sm">
                    {c.causa} <span className="font-bold ml-1">{c.count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Empleos Creados */}
      {tab === 'Empleos Creados' && (
        <div className="space-y-6">
          {/* Noticias positivas */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Señales de Oportunidad y Creación de Empleo</h2>
              <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full font-medium">
                {data.noticias_positivas_recientes.length} noticias recientes
              </span>
            </div>
            <div className="divide-y divide-gray-50">
              {data.noticias_positivas_recientes.map(n => (
                <div key={n.id} className="px-5 py-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm leading-snug">{n.titulo}</p>
                      {n.resumen && (
                        <p className="text-gray-500 text-xs mt-1 line-clamp-2">{n.resumen}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {n.empresa && (
                          <span className="text-xs text-gray-600 font-medium">{n.empresa}</span>
                        )}
                        {n.sector && (
                          <span className="bg-gray-100 text-gray-600 rounded px-2 py-0.5 text-xs capitalize">{n.sector}</span>
                        )}
                        {n.tipo_impacto && (
                          <span className={`rounded px-2 py-0.5 text-xs ${
                            n.tipo_impacto === 'nueva_carrera' ? 'bg-blue-50 text-blue-700' :
                            n.tipo_impacto === 'adopcion_ia' ? 'bg-emerald-50 text-emerald-700' :
                            'bg-purple-50 text-purple-700'
                          }`}>{n.tipo_impacto}</span>
                        )}
                        {n.pais && <span className="text-xs text-gray-400">{n.pais}</span>}
                        <span className="text-xs text-gray-400">{n.fecha?.slice(0, 10)}</span>
                      </div>
                    </div>
                    {n.url && (
                      <a href={n.url} target="_blank" rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-xs shrink-0">fuente →</a>
                    )}
                  </div>
                </div>
              ))}
              {data.noticias_positivas_recientes.length === 0 && (
                <p className="text-center text-gray-400 py-8 text-sm">Sin noticias positivas recientes.</p>
              )}
            </div>
          </div>

          {/* Positivos por sector y vacantes por sector */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Adopción IA por Sector</h2>
              <p className="text-xs text-gray-400 mb-4">Sectores con más noticias de creación/augmentación</p>
              <div className="space-y-3">
                {data.positivos_por_sector.map(s => (
                  <div key={s.sector}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 capitalize">{s.sector}</span>
                      <span className="font-semibold text-emerald-600">{s.noticias}</span>
                    </div>
                    <ColorBar value={s.noticias} max={maxPositivosSector} color="bg-emerald-400" />
                  </div>
                ))}
                {data.positivos_por_sector.length === 0 && (
                  <p className="text-gray-400 text-sm text-center py-4">Sin datos</p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Vacantes IA por Sector</h2>
              <p className="text-xs text-gray-400 mb-4">Empleos actualmente disponibles</p>
              <div className="space-y-3">
                {data.vacantes_por_sector.map(v => (
                  <div key={v.sector}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 capitalize">{v.sector}</span>
                      <span className="font-semibold text-blue-600">{v.count}</span>
                    </div>
                    <ColorBar value={v.count} max={maxVacantesSector} color="bg-blue-400" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Por nivel educativo */}
          {data.vacantes_por_nivel_educativo.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Vacantes por Nivel Educativo Requerido</h2>
              <div className="flex flex-wrap gap-3">
                {data.vacantes_por_nivel_educativo.map(n => (
                  <div key={n.nivel} className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-center min-w-[120px]">
                    <p className="text-2xl font-bold text-blue-700">{n.count}</p>
                    <p className="text-xs text-blue-600 capitalize mt-1">{n.nivel}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Habilidades y Carreras */}
      {tab === 'Habilidades y Carreras' && (
        <div className="space-y-6">
          {/* Top skills */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-1">Top 20 Habilidades Demandadas por la IA</h2>
            <p className="text-xs text-gray-400 mb-5">Extraídas de vacantes laborales activas</p>
            <div className="space-y-2">
              {data.top_skills_demandados.map((s, i) => (
                <div key={s.skill} className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-5 text-right">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-800">{s.skill}</span>
                      <span className="text-gray-400">{s.count}</span>
                    </div>
                    <ColorBar value={s.count} max={maxSkill} color={i < 5 ? 'bg-blue-500' : i < 10 ? 'bg-blue-300' : 'bg-gray-200'} />
                  </div>
                </div>
              ))}
              {data.top_skills_demandados.length === 0 && (
                <p className="text-gray-400 text-center py-4 text-sm">Sin datos de skills</p>
              )}
            </div>
          </div>

          {/* Info carreras */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <h2 className="font-semibold text-amber-900 mb-2">Carreras Universitarias en Riesgo y Oportunidad</h2>
            <p className="text-sm text-amber-800">
              Para ver el ranking completo de carreras con su índice D1 (riesgo de automatización) y D2 (oportunidades generadas por IA),
              consulta la sección de <a href="/kpis" className="underline font-medium">KPIs nacionales</a> o
              explora las <a href="/carreras" className="underline font-medium">carreras</a> con filtro de área de conocimiento.
            </p>
            <div className="mt-3 flex gap-3 flex-wrap">
              <a href="/kpis" className="bg-amber-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-amber-800 transition-colors">
                Ver Rankings D1/D2
              </a>
              <a href="/carreras" className="bg-white border border-amber-300 text-amber-800 px-4 py-2 rounded-lg text-sm hover:bg-amber-100 transition-colors">
                Explorar Carreras
              </a>
            </div>
          </div>

          {/* Skills cloud visual */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Nube de Habilidades IA</h2>
            <div className="flex flex-wrap gap-2">
              {data.top_skills_demandados.map((s, i) => {
                const size = i < 3 ? 'text-xl font-bold' : i < 7 ? 'text-base font-semibold' : i < 12 ? 'text-sm font-medium' : 'text-xs'
                const colors = ['bg-blue-100 text-blue-800', 'bg-purple-100 text-purple-800', 'bg-emerald-100 text-emerald-800', 'bg-amber-100 text-amber-800']
                const color = colors[i % colors.length]
                return (
                  <span key={s.skill} className={`${size} ${color} px-3 py-1.5 rounded-full`}>
                    {s.skill}
                  </span>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Ocupaciones ONET */}
      {tab === 'Ocupaciones ONET' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Mayor riesgo */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-red-50 bg-red-50">
                <h2 className="font-semibold text-red-900">Ocupaciones con Mayor Riesgo de Automatización</h2>
                <p className="text-xs text-red-600 mt-0.5">Fuente: O*NET — probabilidad 0–1</p>
              </div>
              <div className="divide-y divide-gray-50">
                {data.ocupaciones_mayor_riesgo.map(o => (
                  <div key={o.nombre} className="px-5 py-3">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium text-gray-900 leading-snug flex-1 mr-2">{o.nombre}</span>
                      <span className={`text-sm font-bold shrink-0 ${
                        o.p_automatizacion >= 0.7 ? 'text-red-600' :
                        o.p_automatizacion >= 0.4 ? 'text-orange-500' : 'text-gray-500'
                      }`}>
                        {(o.p_automatizacion * 100).toFixed(0)}%
                      </span>
                    </div>
                    <ColorBar value={o.p_automatizacion} max={1} color="bg-red-400" />
                    <div className="flex items-center gap-2 mt-1.5">
                      {o.sector && <span className="text-xs text-gray-400 capitalize">{o.sector}</span>}
                      {o.salario_mediana_usd && (
                        <span className="text-xs text-gray-400">· USD {fmt(o.salario_mediana_usd)}/año</span>
                      )}
                    </div>
                  </div>
                ))}
                {data.ocupaciones_mayor_riesgo.length === 0 && (
                  <p className="text-center text-gray-400 py-8 text-sm">Sin datos de ocupaciones</p>
                )}
              </div>
            </div>

            {/* Mayor oportunidad */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-emerald-50 bg-emerald-50">
                <h2 className="font-semibold text-emerald-900">Ocupaciones con Mayor Augmentación por IA</h2>
                <p className="text-xs text-emerald-600 mt-0.5">IA amplifica la productividad sin eliminar el rol</p>
              </div>
              <div className="divide-y divide-gray-50">
                {data.ocupaciones_mayor_oportunidad.map(o => (
                  <div key={o.nombre} className="px-5 py-3">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium text-gray-900 leading-snug flex-1 mr-2">{o.nombre}</span>
                      <span className="text-sm font-bold text-emerald-600 shrink-0">
                        {(o.p_augmentacion * 100).toFixed(0)}%
                      </span>
                    </div>
                    <ColorBar value={o.p_augmentacion} max={1} color="bg-emerald-400" />
                    <div className="flex items-center gap-2 mt-1.5">
                      {o.sector && <span className="text-xs text-gray-400 capitalize">{o.sector}</span>}
                      {o.salario_mediana_usd && (
                        <span className="text-xs text-gray-400">· USD {fmt(o.salario_mediana_usd)}/año</span>
                      )}
                    </div>
                  </div>
                ))}
                {data.ocupaciones_mayor_oportunidad.length === 0 && (
                  <p className="text-center text-gray-400 py-8 text-sm">Sin datos de ocupaciones</p>
                )}
              </div>
            </div>
          </div>

          {/* Nota metodológica */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
            <h3 className="font-semibold text-blue-900 mb-2">Nota metodológica — ONET</h3>
            <p className="text-sm text-blue-800">
              Los datos de <strong>p_automatizacion</strong> y <strong>p_augmentacion</strong> provienen de O*NET (U.S. Department of Labor),
              que calcula la probabilidad de que las tareas de cada ocupación sean automatizadas o potenciadas por IA
              basándose en el análisis de habilidades, tareas y tecnologías disponibles.
              Valores ≥ 0.7 indican riesgo alto o beneficio alto respectivamente.
            </p>
          </div>
        </div>
      )}

      {/* Footer note */}
      <div className="text-xs text-gray-400 border-t border-gray-100 pt-4">
        Fuentes: GDELT (noticias globales), STPS Observatorio Laboral (vacantes México), O*NET (ocupaciones).
        Datos actualizados en tiempo real desde la base de datos del OIA-EE.
      </div>
    </div>
  )
}

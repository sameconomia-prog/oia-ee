'use client'
import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { getCarrerasPublico, getAreasCarreras } from '@/lib/api'
import type { CarreraKpi } from '@/lib/types'

type Nivel = 'todos' | 'corto' | 'normal' | 'largo'

const NIVEL_LABELS: Record<Nivel, string> = {
  todos: 'Todos',
  corto: '2–3 años',
  normal: '4–5 años',
  largo: '6+ años (posgrado)',
}

function scoreColor(s: number) {
  return s >= 0.65 ? 'text-emerald-700 bg-emerald-50' : s >= 0.4 ? 'text-amber-700 bg-amber-50' : 'text-red-700 bg-red-50'
}

function D1Badge({ v }: { v: number }) {
  const label = v >= 0.7 ? 'Riesgo alto' : v >= 0.4 ? 'Riesgo medio' : 'Riesgo bajo'
  const cls = v >= 0.7 ? 'bg-red-50 text-red-700' : v >= 0.4 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
  return <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${cls}`}>{label}</span>
}

function D2Badge({ v }: { v: number }) {
  const label = v >= 0.6 ? 'Alta oportunidad' : v >= 0.35 ? 'Oportunidad media' : 'Baja oportunidad'
  const cls = v >= 0.6 ? 'bg-emerald-50 text-emerald-700' : v >= 0.35 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'
  return <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${cls}`}>{label}</span>
}

export default function RecomendaPage() {
  const [carreras, setCarreras] = useState<CarreraKpi[]>([])
  const [areas, setAreas] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const [areasSeleccionadas, setAreasSeleccionadas] = useState<Set<string>>(new Set())
  const [prioridad, setPrioridad] = useState(0.5) // 0=seguridad, 1=oportunidad
  const [maxD1, setMaxD1] = useState(1.0)
  const [minD2, setMinD2] = useState(0.0)
  const [nivel] = useState<Nivel>('todos')

  useEffect(() => {
    Promise.all([
      getCarrerasPublico({ limit: 500 }),
      getAreasCarreras(),
    ]).then(([cs, as]) => {
      setCarreras(cs.filter(c => c.kpi))
      setAreas(as.sort())
    }).finally(() => setLoading(false))
  }, [])

  function toggleArea(a: string) {
    setAreasSeleccionadas(prev => {
      const next = new Set(prev)
      next.has(a) ? next.delete(a) : next.add(a)
      return next
    })
  }

  const resultados = useMemo(() => {
    return carreras
      .filter(c => {
        if (!c.kpi) return false
        const d1 = c.kpi.d1_obsolescencia.score
        const d2 = c.kpi.d2_oportunidades.score
        if (d1 > maxD1 || d2 < minD2) return false
        if (areasSeleccionadas.size > 0 && !areasSeleccionadas.has(c.area_conocimiento ?? '')) return false
        return true
      })
      .map(c => ({
        ...c,
        score: (1 - c.kpi!.d1_obsolescencia.score) * (1 - prioridad) + c.kpi!.d2_oportunidades.score * prioridad,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
  }, [carreras, areasSeleccionadas, prioridad, maxD1, minD2, nivel])

  if (loading) return <p className="text-slate-400 text-sm py-12 text-center">Cargando datos de carreras...</p>

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Recomendador de Carreras</h1>
        <p className="text-sm text-slate-500 mt-1">
          Encuentra las carreras con mejor equilibrio entre seguridad ante la IA y oportunidad laboral.
        </p>
      </div>

      <div className="grid grid-cols-[260px_1fr] gap-6 items-start">
        {/* Panel de filtros */}
        <aside className="bg-white border border-slate-200 rounded-xl p-4 space-y-5 sticky top-4">
          <div>
            <p className="text-xs font-semibold text-slate-700 uppercase tracking-widest mb-3">Tu prioridad</p>
            <div className="flex justify-between text-[10px] text-slate-500 mb-1">
              <span>Seguridad laboral</span>
              <span>Oportunidad salarial</span>
            </div>
            <input
              type="range" min={0} max={1} step={0.05}
              value={prioridad}
              onChange={e => setPrioridad(Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
            <p className="text-center text-xs font-medium text-indigo-700 mt-1">
              {prioridad <= 0.25
                ? 'Priorizando seguridad anti-IA'
                : prioridad >= 0.75
                ? 'Priorizando oportunidad laboral'
                : 'Balance seguridad / oportunidad'}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-700 uppercase tracking-widest mb-2">Área de conocimiento</p>
            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {areas.map(a => (
                <label key={a} className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={areasSeleccionadas.has(a)}
                    onChange={() => toggleArea(a)}
                    className="accent-indigo-600"
                  />
                  <span className="leading-snug">{a}</span>
                </label>
              ))}
            </div>
            {areasSeleccionadas.size > 0 && (
              <button
                onClick={() => setAreasSeleccionadas(new Set())}
                className="mt-2 text-[10px] text-indigo-600 hover:underline"
              >
                Limpiar selección
              </button>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-700 uppercase tracking-widest mb-2">Filtros avanzados</p>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Riesgo D1 máximo</span>
                  <span className="font-mono font-semibold text-slate-700">{maxD1.toFixed(1)}</span>
                </div>
                <input
                  type="range" min={0} max={1} step={0.05}
                  value={maxD1}
                  onChange={e => setMaxD1(Number(e.target.value))}
                  className="w-full accent-red-500"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Oportunidad D2 mínima</span>
                  <span className="font-mono font-semibold text-slate-700">{minD2.toFixed(1)}</span>
                </div>
                <input
                  type="range" min={0} max={1} step={0.05}
                  value={minD2}
                  onChange={e => setMinD2(Number(e.target.value))}
                  className="w-full accent-emerald-600"
                />
              </div>
            </div>
          </div>

          <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-100">
            {carreras.length} carreras en la base de datos · mostrando top 20
          </p>
        </aside>

        {/* Resultados */}
        <main>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-slate-900">{resultados.length}</span> carreras encontradas
            </p>
            <p className="text-[10px] text-slate-400">
              Puntuación = (1-D1)×{((1-prioridad)*100).toFixed(0)}% + D2×{(prioridad*100).toFixed(0)}%
            </p>
          </div>

          {resultados.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
              <p className="text-slate-500 text-sm">Sin resultados con los filtros actuales.</p>
              <button
                onClick={() => { setAreasSeleccionadas(new Set()); setMaxD1(1); setMinD2(0) }}
                className="mt-3 text-xs text-indigo-600 hover:underline"
              >
                Restablecer filtros
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {resultados.map((c, i) => {
                const d1 = c.kpi!.d1_obsolescencia.score
                const d2 = c.kpi!.d2_oportunidades.score
                const d3 = c.kpi!.d3_mercado?.score
                return (
                  <div key={c.id} className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-4 hover:border-indigo-200 hover:shadow-sm transition-all">
                    {/* Rank */}
                    <span className={`text-lg font-bold tabular-nums w-7 text-center shrink-0 ${i < 3 ? 'text-indigo-600' : 'text-slate-300'}`}>
                      {i + 1}
                    </span>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <Link href={`/carreras/${c.id}`} className="font-semibold text-slate-800 hover:text-indigo-700 hover:underline text-sm leading-tight">
                        {c.nombre}
                      </Link>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {c.area_conocimiento && (
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                            {c.area_conocimiento}
                          </span>
                        )}
                        <D1Badge v={d1} />
                        <D2Badge v={d2} />
                      </div>
                    </div>

                    {/* Scores */}
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-center hidden sm:block">
                        <p className="text-[10px] text-slate-400">D1</p>
                        <p className="text-xs font-mono font-semibold text-red-600">{d1.toFixed(2)}</p>
                      </div>
                      <div className="text-center hidden sm:block">
                        <p className="text-[10px] text-slate-400">D2</p>
                        <p className="text-xs font-mono font-semibold text-emerald-600">{d2.toFixed(2)}</p>
                      </div>
                      {d3 != null && (
                        <div className="text-center hidden md:block">
                          <p className="text-[10px] text-slate-400">D3</p>
                          <p className="text-xs font-mono font-semibold text-blue-600">{d3.toFixed(2)}</p>
                        </div>
                      )}
                      <div className="text-center">
                        <p className="text-[10px] text-slate-400">Score</p>
                        <span className={`text-sm font-bold font-mono px-2 py-0.5 rounded ${scoreColor(c.score)}`}>
                          {c.score.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="mt-4 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
            <p className="text-xs text-indigo-800">
              <span className="font-semibold">Metodología: </span>
              El score pondera el riesgo de obsolescencia IA (D1, menor=mejor) y la oportunidad laboral (D2, mayor=mejor)
              según tu preferencia. Explora el detalle de cada carrera para ver predicciones a 1, 3 y 5 años.
            </p>
            <Link href="/metodologia" className="text-[11px] text-indigo-600 hover:underline mt-1 inline-block">
              Ver metodología completa →
            </Link>
          </div>
        </main>
      </div>
    </div>
  )
}

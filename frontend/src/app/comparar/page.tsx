'use client'
import { useState, useEffect, useMemo, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { getPublicoIes, getCarrerasDeIes, getBenchmarkCareers, getIesDetalle } from '@/lib/api'
import ComparacionIES from '@/components/ComparacionIES'
import ComparacionResumenChart from '@/components/ComparacionResumenChart'
import type { CarreraKpi, IesDetalle } from '@/lib/types'

type IesOpcion = { id: string; nombre: string; nombre_corto?: string }

export default function CompararPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-400">Cargando…</div>}>
      <CompararContent />
    </Suspense>
  )
}

function CompararContent() {
  const searchParams = useSearchParams()
  const [ies, setIes] = useState<IesOpcion[]>([])
  const [iesAId, setIesAId] = useState(searchParams.get('iesA') ?? '')
  const [iesBId, setIesBId] = useState(searchParams.get('iesB') ?? '')
  const [carrerasA, setCarrerasA] = useState<CarreraKpi[]>([])
  const [carrerasB, setCarrerasB] = useState<CarreraKpi[]>([])
  const [benchmarkMap, setBenchmarkMap] = useState<Map<string, number>>(new Map())
  const [detalleA, setDetalleA] = useState<IesDetalle | null>(null)
  const [detalleB, setDetalleB] = useState<IesDetalle | null>(null)

  useEffect(() => {
    getPublicoIes().then(setIes).catch(() => setIes([]))
    getBenchmarkCareers().then(list => setBenchmarkMap(new Map(list.map(b => [b.slug, b.urgencia_curricular])))).catch(() => {})
  }, [])

  useEffect(() => {
    if (iesAId) {
      getCarrerasDeIes(iesAId).then(setCarrerasA).catch(() => setCarrerasA([]))
      getIesDetalle(iesAId).then(setDetalleA).catch(() => setDetalleA(null))
    } else { setCarrerasA([]); setDetalleA(null) }
  }, [iesAId])

  useEffect(() => {
    if (iesBId) {
      getCarrerasDeIes(iesBId).then(setCarrerasB).catch(() => setCarrerasB([]))
      getIesDetalle(iesBId).then(setDetalleB).catch(() => setDetalleB(null))
    } else { setCarrerasB([]); setDetalleB(null) }
  }, [iesBId])

  const carrerasComunes = useMemo(() => {
    const nombresB = new Map(carrerasB.map(c => [c.nombre.toLowerCase(), c]))
    return carrerasA
      .filter(c => nombresB.has(c.nombre.toLowerCase()))
      .map(cA => ({ cA, cB: nombresB.get(cA.nombre.toLowerCase())! }))
  }, [carrerasA, carrerasB])

  function calcPortfolioUrgencia(carreras: typeof carrerasA) {
    const scores = carreras
      .filter(c => c.benchmark_slug && benchmarkMap.has(c.benchmark_slug))
      .map(c => benchmarkMap.get(c.benchmark_slug!)!)
    if (scores.length === 0) return null
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Comparar Instituciones</h1>
      <p className="text-sm text-gray-500 mb-6">
        Compara el índice D4 institucional entre dos IES.
      </p>

      <div className="flex gap-4 mb-8">
        {(['A', 'B'] as const).map((letra, i) => {
          const val = i === 0 ? iesAId : iesBId
          const set = i === 0 ? setIesAId : setIesBId
          return (
            <div key={letra} className="flex-1">
              <label className="block text-sm font-medium text-gray-600 mb-1">IES {letra}</label>
              <select
                value={val}
                onChange={e => set(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">— Seleccionar —</option>
                {ies.map(op => (
                  <option key={op.id} value={op.id}>{op.nombre_corto ?? op.nombre}</option>
                ))}
              </select>
            </div>
          )
        })}
      </div>

      {iesAId && iesBId && iesAId !== iesBId ? (
        <>
          <ComparacionIES
            iesAId={iesAId}
            iesBId={iesBId}
            iesANombre={ies.find(i => i.id === iesAId)?.nombre ?? iesAId}
            iesBNombre={ies.find(i => i.id === iesBId)?.nombre ?? iesBId}
          />

          {/* D1/D2 aggregate comparison */}
          {detalleA && detalleB && (
            <div className="mt-6 border rounded-lg overflow-hidden text-sm">
              {(() => {
                const nombreA = ies.find(i => i.id === iesAId)?.nombre_corto ?? ies.find(i => i.id === iesAId)?.nombre ?? iesAId
                const nombreB = ies.find(i => i.id === iesBId)?.nombre_corto ?? ies.find(i => i.id === iesBId)?.nombre ?? iesBId
                const urgA = calcPortfolioUrgencia(carrerasA)
                const urgB = calcPortfolioUrgencia(carrerasB)
                const rows = [
                  { label: 'Promedio D1 (Riesgo)', vA: detalleA.promedio_d1, vB: detalleB.promedio_d1, invert: true },
                  { label: 'Promedio D2 (Oportunidades)', vA: detalleA.promedio_d2, vB: detalleB.promedio_d2, invert: false },
                  { label: 'Carreras con D1 ≥ 0.6', vA: detalleA.carreras_riesgo_alto, vB: detalleB.carreras_riesgo_alto, invert: true, isCount: true },
                  ...(urgA !== null && urgB !== null ? [{ label: 'Urgencia curricular media', vA: urgA, vB: urgB, invert: true, isCount: true }] : []),
                ] as { label: string; vA: number; vB: number; invert: boolean; isCount?: boolean }[]
                return (
                  <>
                    <div className="grid grid-cols-3 bg-gray-800 text-white text-xs font-semibold">
                      <div className="px-4 py-2">Indicador</div>
                      <div className="px-4 py-2 text-center border-l border-gray-700 truncate">{nombreA}</div>
                      <div className="px-4 py-2 text-center border-l border-gray-700 truncate">{nombreB}</div>
                    </div>
                    {rows.map(({ label, vA, vB, invert, isCount }) => {
                      const diff = Math.abs(vA - vB)
                      const ganA = diff >= 0.005 && (invert ? vA < vB : vA > vB)
                      const ganB = diff >= 0.005 && (invert ? vB < vA : vB > vA)
                      return (
                        <div key={label} className="grid grid-cols-3 border-t text-xs">
                          <div className="px-4 py-2 text-gray-500">{label}</div>
                          <div className={`px-4 py-2 text-center border-l font-mono ${ganA ? 'bg-green-50 font-bold text-green-800' : 'text-gray-700'}`}>
                            {isCount ? vA : vA.toFixed(2)}{ganA && ' ✓'}
                          </div>
                          <div className={`px-4 py-2 text-center border-l font-mono ${ganB ? 'bg-green-50 font-bold text-green-800' : 'text-gray-700'}`}>
                            {isCount ? vB : vB.toFixed(2)}{ganB && ' ✓'}
                          </div>
                        </div>
                      )
                    })}
                    <div className="px-4 py-2 bg-gray-50 border-t text-[11px] text-gray-400">
                      KPIs nacionales agregados · D1: menor=mejor · D2: mayor=mejor · Urgencia: menor=mejor · ✓ indica mejor valor
                    </div>
                  </>
                )
              })()}
            </div>
          )}

          {/* Gráfica comparativa de promedios */}
          {carrerasComunes.length > 0 && (
            <div className="mt-6">
              <ComparacionResumenChart
                iesANombre={ies.find(i => i.id === iesAId)?.nombre_corto ?? ies.find(i => i.id === iesAId)?.nombre ?? iesAId}
                iesBNombre={ies.find(i => i.id === iesBId)?.nombre_corto ?? ies.find(i => i.id === iesBId)?.nombre ?? iesBId}
                carrerasComunes={carrerasComunes}
              />
            </div>
          )}

          {/* Carreras en común */}
          {carrerasComunes.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-gray-800">
                  Carreras en común · {carrerasComunes.length}
                </h2>
                <button
                  onClick={() => {
                    const nombreA = ies.find(i => i.id === iesAId)?.nombre_corto ?? iesAId
                    const nombreB = ies.find(i => i.id === iesBId)?.nombre_corto ?? iesBId
                    const headers = ['Carrera', `D1 ${nombreA}`, `D1 ${nombreB}`, `D2 ${nombreA}`, `D2 ${nombreB}`, `D3 ${nombreA}`, `D3 ${nombreB}`]
                    const rows = carrerasComunes.map(({ cA, cB }) => [
                      cA.nombre,
                      cA.kpi?.d1_obsolescencia.score.toFixed(4) ?? '',
                      cB.kpi?.d1_obsolescencia.score.toFixed(4) ?? '',
                      cA.kpi?.d2_oportunidades.score.toFixed(4) ?? '',
                      cB.kpi?.d2_oportunidades.score.toFixed(4) ?? '',
                      cA.kpi?.d3_mercado.score.toFixed(4) ?? '',
                      cB.kpi?.d3_mercado.score.toFixed(4) ?? '',
                    ])
                    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
                    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `comparacion_carreras_${new Date().toISOString().slice(0, 10)}.csv`
                    a.click()
                    URL.revokeObjectURL(url)
                  }}
                  className="text-xs px-3 py-1 border rounded hover:bg-gray-50 text-gray-600"
                >
                  ↓ CSV
                </button>
              </div>
              <div className="border rounded-lg overflow-hidden text-sm">
                <div className="grid grid-cols-6 bg-gray-800 text-white text-xs font-semibold px-4 py-2">
                  <div className="col-span-2">Carrera</div>
                  <div className="text-center">D1 A / B</div>
                  <div className="text-center">D2 A / B</div>
                  <div className="text-center">D3 A / B</div>
                  <div className="text-center text-violet-300" title="Urgencia curricular global (benchmarks internacionales)">U</div>
                </div>
                {carrerasComunes.map(({ cA, cB }) => {
                  const slug = cA.benchmark_slug ?? cB.benchmark_slug
                  const urgencia = slug ? benchmarkMap.get(slug) : undefined
                  const uCls = urgencia == null ? '' : urgencia >= 60 ? 'text-red-600' : urgencia >= 30 ? 'text-amber-600' : 'text-emerald-600'
                  return (
                    <div key={cA.id} className="grid grid-cols-6 border-t px-4 py-2 hover:bg-gray-50">
                      <div className="col-span-2 text-xs truncate" title={cA.nombre}>
                        <Link href={`/carreras/${cA.id}`} className="text-gray-700 hover:text-indigo-700 hover:underline">{cA.nombre}</Link>
                      </div>
                      <div className="text-center font-mono text-xs">
                        <span className={cA.kpi && cA.kpi.d1_obsolescencia.score >= 0.6 ? 'text-red-600' : 'text-green-600'}>
                          {cA.kpi?.d1_obsolescencia.score.toFixed(2) ?? '—'}
                        </span>
                        {' / '}
                        <span className={cB.kpi && cB.kpi.d1_obsolescencia.score >= 0.6 ? 'text-red-600' : 'text-green-600'}>
                          {cB.kpi?.d1_obsolescencia.score.toFixed(2) ?? '—'}
                        </span>
                      </div>
                      <div className="text-center font-mono text-xs">
                        {cA.kpi?.d2_oportunidades.score.toFixed(2) ?? '—'}
                        {' / '}
                        {cB.kpi?.d2_oportunidades.score.toFixed(2) ?? '—'}
                      </div>
                      <div className="text-center font-mono text-xs">
                        {cA.kpi?.d3_mercado.score.toFixed(2) ?? '—'}
                        {' / '}
                        {cB.kpi?.d3_mercado.score.toFixed(2) ?? '—'}
                      </div>
                      <div className="text-center font-mono text-xs">
                        {urgencia != null ? (
                          <Link href={`/benchmarks/${slug}`} className={`font-bold hover:underline ${uCls}`}>{urgencia}</Link>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              <p className="text-xs text-gray-400 mt-1">D1: menor=mejor · D2/D3: mayor=mejor</p>
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-gray-400 text-center py-12">
          Selecciona dos instituciones distintas para comparar.
        </p>
      )}
    </div>
  )
}


'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { getCarreraDetalle, getKpisHistorico } from '@/lib/api'
import type { CarreraDetalle, HistoricoSerie } from '@/lib/types'
import FanChart from '@/components/FanChart'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

type ScoreKey = 'd1_obsolescencia' | 'd2_oportunidades' | 'd3_mercado' | 'd6_estudiantil'

interface PredData {
  predicciones: Record<string, {
    fecha_prediccion: string
    valor_predicho: number
    ci_80_lower: number | null
    ci_80_upper: number | null
    ci_95_lower: number | null
    ci_95_upper: number | null
  }[]>
}

interface SemaforoEntry {
  color: string
  valor_predicho: number | null
}

type SemaforoData = Record<string, SemaforoEntry>

const KPI_META: { key: ScoreKey; label: string; invert: boolean }[] = [
  { key: 'd1_obsolescencia', label: 'D1 Obsolescencia', invert: true },
  { key: 'd2_oportunidades', label: 'D2 Oportunidades', invert: false },
  { key: 'd3_mercado', label: 'D3 Mercado Laboral', invert: false },
  { key: 'd6_estudiantil', label: 'D6 Perfil Estudiantil', invert: false },
]

function ScoreBar({ label, score, invert }: { label: string; score: number; invert: boolean }) {
  const bad = invert ? score >= 0.6 : score < 0.4
  const ok = invert ? score < 0.4 : score >= 0.6
  const color = ok ? 'bg-green-500' : bad ? 'bg-red-500' : 'bg-yellow-400'
  const textColor = ok ? 'text-green-700' : bad ? 'text-red-700' : 'text-yellow-700'
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-medium text-gray-600">{label}</span>
        <span className={`text-sm font-bold font-mono ${textColor}`}>{score.toFixed(3)}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score * 100}%` }} />
      </div>
    </div>
  )
}

function MiniLineChart({ d1, d2 }: { d1: HistoricoSerie; d2: HistoricoSerie }) {
  const points = d1.serie
  if (points.length < 2) return <p className="text-xs text-gray-400 py-4 text-center">Sin datos históricos suficientes.</p>
  const W = 400, H = 80, PAD = 8
  const allVals = [...d1.serie.map(p => p.valor), ...d2.serie.map(p => p.valor)]
  const minV = Math.min(...allVals, 0), maxV = Math.max(...allVals, 1)
  const xOf = (i: number) => PAD + (i / (points.length - 1)) * (W - PAD * 2)
  const yOf = (v: number) => H - PAD - ((v - minV) / (maxV - minV)) * (H - PAD * 2)
  const toPath = (serie: HistoricoSerie) =>
    serie.serie.map((p, i) => `${i === 0 ? 'M' : 'L'}${xOf(i)},${yOf(p.valor)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-20">
      <path d={toPath(d1)} fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinejoin="round" />
      <path d={toPath(d2)} fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

export default function CarreraDetallePage() {
  const { id } = useParams<{ id: string }>()
  const [detalle, setDetalle] = useState<CarreraDetalle | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [histD1, setHistD1] = useState<HistoricoSerie | null>(null)
  const [histD2, setHistD2] = useState<HistoricoSerie | null>(null)
  const [predData, setPredData] = useState<PredData | null>(null)
  const [semaforoRes, setSemaforoRes] = useState<SemaforoData | null>(null)

  useEffect(() => {
    if (!id) return
    getCarreraDetalle(id)
      .then(setDetalle)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
    getKpisHistorico(id, 'd1_score', 30).then(setHistD1).catch(() => {})
    getKpisHistorico(id, 'd2_score', 30).then(setHistD2).catch(() => {})
    fetch(`${BASE}/predicciones/carrera/${id}?kpi=D1`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setPredData(data) })
      .catch(() => {})
    fetch(`${BASE}/predicciones/carrera/${id}/semaforo`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setSemaforoRes(data) })
      .catch(() => {})
  }, [id])

  if (loading) return <p className="text-gray-400 text-sm py-8 text-center">Cargando...</p>

  if (notFound) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 text-sm mb-4">Carrera no encontrada.</p>
        <Link href="/kpis" className="text-indigo-600 text-sm hover:underline">← Ver KPIs</Link>
      </div>
    )
  }

  const d = detalle!

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/carreras" className="text-xs text-indigo-600 hover:underline">← Carreras</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">{d.nombre}</h1>
        <div className="flex flex-wrap gap-2 mt-2">
          {d.area_conocimiento && (
            <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-xs font-medium">{d.area_conocimiento}</span>
          )}
          {d.nivel && (
            <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-xs">{d.nivel}</span>
          )}
          {d.duracion_anios && (
            <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-xs">{d.duracion_anios} años</span>
          )}
        </div>
      </div>

      {d.kpi && (
        <div className="bg-white rounded-xl border shadow-sm p-5 mb-6">
          <h2 className="font-semibold text-gray-800 text-sm mb-4">Indicadores KPI</h2>
          <div className="space-y-4">
            {KPI_META.map(({ key, label, invert }) => (
              <ScoreBar
                key={key}
                label={label}
                score={d.kpi![key].score}
                invert={invert}
              />
            ))}
          </div>
        </div>
      )}

      {histD1 && histD2 && (
        <div className="bg-white rounded-xl border shadow-sm p-5 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-gray-800 text-sm">Tendencia histórica</h2>
            <div className="flex gap-3 text-xs">
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-0.5 bg-red-500"></span>D1 Obsolescencia</span>
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-0.5 bg-blue-500"></span>D2 Oportunidades</span>
            </div>
          </div>
          <MiniLineChart d1={histD1} d2={histD2} />
        </div>
      )}

      {/* Semáforo Predictivo */}
      {semaforoRes && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            Proyección de Riesgo D1
          </h2>
          <div className="flex gap-4">
            {([['1_año', '1 año'], ['3_años', '3 años'], ['5_años', '5 años']] as [string, string][]).map(([key, label]) => {
              const s = semaforoRes[key]
              const colors: Record<string, string> = {
                verde: 'bg-green-100 text-green-800 border-green-300',
                amarillo: 'bg-yellow-100 text-yellow-800 border-yellow-300',
                rojo: 'bg-red-100 text-red-800 border-red-300',
                sin_datos: 'bg-gray-100 text-gray-500 border-gray-200',
              }
              const icons: Record<string, string> = { verde: '🟢', amarillo: '🟡', rojo: '🔴', sin_datos: '⚫' }
              const colorKey = s?.color ?? 'sin_datos'
              const cls = colors[colorKey] ?? colors['sin_datos']
              return (
                <div key={key} className={`flex-1 p-3 rounded border text-center ${cls}`}>
                  <div className="text-lg">{icons[colorKey] ?? icons['sin_datos']}</div>
                  <div className="text-sm font-semibold">{label}</div>
                  {s?.valor_predicho != null && (
                    <div className="text-xs mt-1">D1 = {s.valor_predicho.toFixed(2)}</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Fan Chart D1 */}
      {predData?.predicciones?.D1 && predData.predicciones.D1.length > 0 && (
        <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200">
          <FanChart
            historico={[]}
            predicciones={predData.predicciones.D1}
            kpiNombre="D1"
            titulo="Proyección D1 — Riesgo de Obsolescencia (3 años)"
          />
        </div>
      )}

      {d.instituciones.length > 0 && (
        <div className="bg-white rounded-xl border shadow-sm">
          <div className="px-5 py-4 border-b">
            <h2 className="font-semibold text-gray-800 text-sm">
              Ofrecida por {d.instituciones.length} institución{d.instituciones.length !== 1 ? 'es' : ''}
            </h2>
          </div>
          {d.instituciones.map(inst => (
            <div key={inst.ies_id} className="px-5 py-3 border-b last:border-0 flex items-center justify-between">
              <div>
                <Link href={`/ies/${inst.ies_id}`} className="text-sm font-medium text-indigo-700 hover:underline">
                  {inst.ies_nombre}
                </Link>
                {inst.ciclo && <p className="text-xs text-gray-400">{inst.ciclo}</p>}
              </div>
              {inst.matricula != null && (
                <span className="text-xs text-gray-500">{inst.matricula.toLocaleString()} estudiantes</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

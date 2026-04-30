// frontend/src/app/carreras/[id]/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { getCarreraDetalle, getKpisHistorico, getBenchmarkCareerDetail, getBenchmarkSources } from '@/lib/api'
import type { CarreraDetalle, HistoricoSerie, BenchmarkCareerDetail, BenchmarkSource } from '@/lib/types'
import FanChart from '@/components/FanChart'
import SkillTreemap from '@/components/SkillTreemap'
import KpiRadarChart from '@/components/KpiRadarChart'
import SkillConvergenceTable from '@/components/benchmarks/SkillConvergenceTable'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import SectionHeader from '@/components/ui/SectionHeader'

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
  const barColor = ok ? 'bg-emerald-500' : bad ? 'bg-red-500' : 'bg-yellow-400'
  const textColor = ok ? 'text-emerald-700' : bad ? 'text-red-700' : 'text-yellow-700'
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-medium text-slate-600">{label}</span>
        <span className={`text-sm font-bold font-mono ${textColor}`}>{score.toFixed(3)}</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${score * 100}%` }} />
      </div>
    </div>
  )
}

function MiniLineChart({ d1, d2 }: { d1: HistoricoSerie; d2: HistoricoSerie }) {
  const points = d1.serie
  if (points.length < 2) return <p className="text-xs text-slate-400 py-4 text-center">Sin datos históricos suficientes.</p>
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
      <path d={toPath(d2)} fill="none" stroke="#4f46e5" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

const SEMAFORO_VARIANT: Record<string, 'risk' | 'oportunidad' | 'neutro'> = {
  rojo: 'risk',
  verde: 'oportunidad',
  amarillo: 'neutro',
  sin_datos: 'neutro',
}

const BENCHMARK_ARTICLE_MAP: Record<string, string> = {
  'derecho': '2026-04-derecho-ia-2030',
  'medicina': '2026-04-medicina-ia-mexico',
  'arquitectura': '2026-04-arquitectura-ia-2030',
  'enfermeria': '2026-04-enfermeria-ia-2030',
  'mercadotecnia': '2026-04-mercadotecnia-ia-2030',
  'psicologia': '2026-04-psicologia-ia-2030',
  'administracion-empresas': '2026-04-administracion-ia-2030',
  'contaduria': '2026-04-contaduria-ia-2030',
  'diseno-grafico': '2026-04-diseno-grafico-ia-2030',
  'ingenieria-sistemas': '2026-04-ingenieros-software-ia',
  'comunicacion': '2026-04-comunicacion-ia-2030',
  'educacion': '2026-04-educacion-ia-2030',
  'economia': '2026-04-economia-ia-2030',
  'turismo': '2026-04-turismo-ia-2030',
  'ciencias-politicas': '2026-04-ciencias-politicas-ia-2030',
  'nutricion': '2026-04-nutricion-ia-2030',
  'ingenieria-civil': '2026-04-ingenieria-civil-ia-2030',
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
  const [benchmarkDetail, setBenchmarkDetail] = useState<BenchmarkCareerDetail | null>(null)
  const [benchmarkSources, setBenchmarkSources] = useState<BenchmarkSource[]>([])

  useEffect(() => {
    if (!id) return
    getCarreraDetalle(id)
      .then(d => {
        setDetalle(d)
        if (d.benchmark_slug) {
          getBenchmarkCareerDetail(d.benchmark_slug).then(setBenchmarkDetail).catch(() => {})
          getBenchmarkSources().then(setBenchmarkSources).catch(() => {})
        }
      })
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

  if (loading) return <p className="text-slate-400 text-sm py-8 text-center">Cargando...</p>

  if (notFound) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500 text-sm mb-4">Carrera no encontrada.</p>
        <Link href="/kpis" className="text-brand-600 text-sm hover:underline">← Ver KPIs</Link>
      </div>
    )
  }

  const d = detalle!

  return (
    <div className="max-w-4xl mx-auto">
      {/* Breadcrumb + título */}
      <div className="mb-6">
        <Link href="/carreras" className="text-xs text-brand-600 hover:underline">← Carreras</Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">{d.nombre}</h1>
        <div className="flex flex-wrap gap-2 mt-2">
          {d.area_conocimiento && <Badge variant="default">{d.area_conocimiento}</Badge>}
          {d.nivel && <Badge variant="neutro">{d.nivel}</Badge>}
          {d.duracion_anios && <Badge variant="neutro">{d.duracion_anios} años</Badge>}
        </div>
      </div>

      {/* Layout 2 columnas: KPIs izquierda (2/3) + Semáforo derecha (1/3) */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        {/* KPI bars + radar — 2/3 */}
        {d.kpi && (
          <Card className="col-span-2 p-5">
            <h2 className="font-semibold text-slate-800 text-sm mb-4">Indicadores KPI</h2>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                {KPI_META.map(({ key, label, invert }) => (
                  <ScoreBar key={key} label={label} score={d.kpi![key].score} invert={invert} />
                ))}
              </div>
              <KpiRadarChart kpi={d.kpi} />
            </div>
          </Card>
        )}

        {/* Semáforo Predictivo — 1/3 */}
        {semaforoRes && (
          <Card className="p-5">
            <h2 className="font-semibold text-slate-800 text-sm mb-4">Proyección D1</h2>
            <div className="space-y-3">
              {([['1_año', '1 año'], ['3_años', '3 años'], ['5_años', '5 años']] as [string, string][]).map(([key, label]) => {
                const s = semaforoRes[key]
                const colorKey = s?.color ?? 'sin_datos'
                const variant = SEMAFORO_VARIANT[colorKey] ?? 'neutro'
                return (
                  <div key={key} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50">
                    <span className="text-sm font-medium text-slate-700">{label}</span>
                    <div className="flex items-center gap-2">
                      {s?.valor_predicho != null && (
                        <span className="text-xs font-mono text-slate-500">D1 = {s.valor_predicho.toFixed(2)}</span>
                      )}
                      <Badge variant={variant}>{colorKey}</Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        )}
      </div>

      {/* Tendencia histórica */}
      {histD1 && histD2 && (
        <Card className="mb-6 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-800 text-sm">Tendencia histórica</h2>
            <div className="flex gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-0.5 bg-red-500"></span>D1 Obsolescencia</span>
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-0.5 bg-brand-600"></span>D2 Oportunidades</span>
            </div>
          </div>
          <MiniLineChart d1={histD1} d2={histD2} />
        </Card>
      )}

      {/* Fan Chart D1 */}
      {predData?.predicciones?.D1 && predData.predicciones.D1.length > 0 && (
        <Card className="mb-6 p-5">
          <FanChart
            historico={[]}
            predicciones={predData.predicciones.D1}
            kpiNombre="D1"
            titulo="Proyección D1 — Riesgo de Obsolescencia (3 años)"
          />
        </Card>
      )}

      {/* Mapa de Skills P5 */}
      <Card className="mb-6 p-5">
        <SectionHeader
          title="Mapa de Skills — Impacto IA"
          subtitle="Skills demandadas en vacantes y su nivel de exposición a automatización"
        />
        <SkillTreemap carreraId={id} />
      </Card>

      {/* Benchmarks globales */}
      {benchmarkDetail && benchmarkSources.length > 0 && (
        <Card className="mb-6 p-5">
          <div className="flex items-start justify-between mb-4">
            <SectionHeader
              title="Benchmarks Globales"
              subtitle="Convergencia de 5 fuentes internacionales sobre las habilidades de esta carrera"
            />
            {d.benchmark_slug && BENCHMARK_ARTICLE_MAP[d.benchmark_slug] && (
              <Link
                href={`/investigaciones/${BENCHMARK_ARTICLE_MAP[d.benchmark_slug]}`}
                className="shrink-0 text-xs text-brand-600 hover:underline font-medium ml-4"
              >
                Leer análisis completo →
              </Link>
            )}
          </div>
          <SkillConvergenceTable
            skills={benchmarkDetail.skills}
            sources={benchmarkSources}
            careerSlug={d.benchmark_slug ?? undefined}
          />
          <div className="flex items-center justify-between mt-3">
            <p className="text-xs text-slate-400">
              Fuentes: WEF 2025 · McKinsey 2023 · Frey-Osborne 2013 · CEPAL 2023 · Anthropic 2025
            </p>
            {d.benchmark_slug && (
              <Link href={`/benchmarks/${d.benchmark_slug}`} className="text-xs text-brand-600 hover:underline font-medium">
                Ver benchmark completo →
              </Link>
            )}
          </div>
        </Card>
      )}

      {/* IES que ofrecen la carrera */}
      {d.instituciones.length > 0 && (
        <Card className="p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-800 text-sm">
              Ofrecida por {d.instituciones.length} institución{d.instituciones.length !== 1 ? 'es' : ''}
            </h2>
          </div>
          {d.instituciones.map(inst => (
            <div key={inst.ies_id} className="px-5 py-3 border-b border-slate-100 last:border-0 flex items-center justify-between">
              <div>
                <Link href={`/ies/${inst.ies_id}`} className="text-sm font-medium text-brand-700 hover:underline">
                  {inst.ies_nombre}
                </Link>
                {inst.ciclo && <p className="text-xs text-slate-400">{inst.ciclo}</p>}
              </div>
              {inst.matricula != null && (
                <span className="text-xs text-slate-500">{inst.matricula.toLocaleString()} estudiantes</span>
              )}
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}

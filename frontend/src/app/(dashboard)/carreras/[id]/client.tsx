// frontend/src/app/carreras/[id]/page.tsx
'use client'
import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { getCarreraDetalle, getKpisHistorico, getBenchmarkCareerDetail, getBenchmarkSources, getBenchmarkCareers, getVacantesTopSkills, getCarrerasPublico, getTendenciasNacionales } from '@/lib/api'
import type { CarreraDetalle, CarreraKpi, KpiResult, HistoricoSerie, BenchmarkCareerDetail, BenchmarkSource, BenchmarkCareerSummary, SkillFreq, TendenciaNacional } from '@/lib/types'

function normSkill(s: string) {
  return s.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}
import { BENCHMARK_TO_ARTICLE } from '@/lib/benchmark-articles'
import FanChart from '@/components/FanChart'
import SkillTreemap from '@/components/SkillTreemap'
import KpiRadarChart from '@/components/KpiRadarChart'
import SkillConvergenceTable from '@/components/benchmarks/SkillConvergenceTable'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import SectionHeader from '@/components/ui/SectionHeader'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

type ArticleCard = { slug: string; titulo: string; tipo: string; fecha: string; tiempo_lectura: string }
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

const BENCHMARK_ARTICLE_MAP = BENCHMARK_TO_ARTICLE

function narrativaImpacto(
  kpi: KpiResult,
  nombre: string,
  benchmarkSummary: BenchmarkCareerSummary | null,
  tendenciaNacional: TendenciaNacional | null,
): { titulo: string; texto: string; accion: string; color: 'rojo' | 'ambar' | 'verde' } {
  const d1 = kpi.d1_obsolescencia.score
  const d2 = kpi.d2_oportunidades.score
  const urgencia = benchmarkSummary?.urgencia_curricular ?? null
  const natD1 = tendenciaNacional?.d1_score ?? null
  const natD2 = tendenciaNacional?.d2_score ?? null
  const vsNat = natD1 != null ? (d1 > natD1 ? `${(d1 - natD1).toFixed(2)} puntos sobre el promedio nacional` : `${(natD1 - d1).toFixed(2)} puntos bajo el promedio nacional`) : null

  if (d1 >= 0.6 && urgencia != null && urgencia >= 60) {
    return {
      titulo: 'Intervención curricular urgente',
      texto: `${nombre} registra D1 ${d1.toFixed(2)} y urgencia benchmark ${urgencia}/100 confirmada por 5 fuentes internacionales. La convergencia de señales locales y globales indica obsolescencia acelerada por automatización.${vsNat ? ` La carrera se ubica ${vsNat}.` : ''}`,
      accion: 'Rediseño profundo del plan de estudios con incorporación de IA aplicada y competencias digitales avanzadas.',
      color: 'rojo',
    }
  }
  if (d1 >= 0.6) {
    return {
      titulo: 'Riesgo de obsolescencia elevado',
      texto: `Con D1 ${d1.toFixed(2)}, ${nombre} presenta exposición alta a desplazamiento por automatización.${vsNat ? ` Se ubica ${vsNat}.` : ''}${urgencia != null ? ` Urgencia benchmark: ${urgencia}/100.` : ''}`,
      accion: 'Revisar contenidos con mayor exposición a automatización e integrar habilidades digitales emergentes.',
      color: 'rojo',
    }
  }
  if (d2 >= 0.6 && d1 < 0.4) {
    const natMsg = natD2 != null ? ` D2 ${d2 >= natD2 ? `${(d2 - natD2).toFixed(2)} sobre` : `${(natD2 - d2).toFixed(2)} bajo`} media nacional.` : ''
    return {
      titulo: 'Perfil de alta oportunidad curricular',
      texto: `${nombre} muestra alta oportunidad digital (D2 ${d2.toFixed(2)}) con baja obsolescencia (D1 ${d1.toFixed(2)}).${natMsg}${urgencia != null ? ` Urgencia benchmark ${urgencia}/100 — ${urgencia < 30 ? 'perfil estable.' : 'actualización preventiva recomendada.'}` : ''}`,
      accion: 'Fortalecer habilidades emergentes identificadas en benchmarks internacionales.',
      color: 'verde',
    }
  }
  if (d1 >= 0.4) {
    return {
      titulo: 'Riesgo moderado — monitoreo activo recomendado',
      texto: `${nombre} registra D1 ${d1.toFixed(2)}, rango de riesgo medio.${vsNat ? ` Se ubica ${vsNat}.` : ''}${urgencia != null ? ` Urgencia benchmark ${urgencia}/100${urgencia >= 30 ? ' — actualización preventiva recomendada.' : '.'}` : ''}`,
      accion: 'Mapear competencias en declive y diseñar actualizaciones incrementales.',
      color: 'ambar',
    }
  }
  return {
    titulo: 'Perfil curricular estable',
    texto: `${nombre} presenta baja obsolescencia (D1 ${d1.toFixed(2)}) y oportunidad digital ${d2 >= 0.4 ? 'moderada-alta' : 'en desarrollo'} (D2 ${d2.toFixed(2)}).${urgencia != null ? ` Urgencia benchmark ${urgencia}/100 dentro de parámetros normales.` : ''}`,
    accion: 'Mantener actualización continua de habilidades digitales como medida preventiva.',
    color: 'verde',
  }
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
  const [benchmarkSummary, setBenchmarkSummary] = useState<BenchmarkCareerSummary | null>(null)
  const [vacanteSkills, setVacanteSkills] = useState<SkillFreq[]>([])
  const [lecturas, setLecturas] = useState<ArticleCard[]>([])
  const [similares, setSimilares] = useState<CarreraKpi[]>([])
  const [tendenciaNacional, setTendenciaNacional] = useState<TendenciaNacional | null>(null)

  const promedioArea = useMemo(() => {
    const conKpi = similares.filter(c => c.kpi != null)
    if (conKpi.length === 0) return null
    const d1 = conKpi.reduce((s, c) => s + c.kpi!.d1_obsolescencia.score, 0) / conKpi.length
    const d2 = conKpi.reduce((s, c) => s + c.kpi!.d2_oportunidades.score, 0) / conKpi.length
    return { d1, d2, n: conKpi.length }
  }, [similares])

  const demandaLaboral = useMemo(() => {
    if (!benchmarkDetail || vacanteSkills.length === 0) return []
    const vacMap = new Map(vacanteSkills.map(sf => [normSkill(sf.nombre), sf.count]))
    return benchmarkDetail.skills
      .map(sk => {
        const q = normSkill(sk.skill_nombre)
        const count = vacMap.get(q) ??
          Array.from(vacMap.entries()).find(([k]) => k.includes(q) || q.includes(k))?.[1] ?? 0
        return { ...sk, vacanteCount: count }
      })
      .filter(sk => sk.vacanteCount > 0)
      .sort((a, b) => b.vacanteCount - a.vacanteCount)
      .slice(0, 8)
  }, [benchmarkDetail, vacanteSkills])

  useEffect(() => {
    if (!id) return
    getCarreraDetalle(id)
      .then(d => {
        setDetalle(d)
        document.title = `${d.nombre} — OIA-EE`
        if (d.benchmark_slug) {
          const slug = d.benchmark_slug
          getBenchmarkCareerDetail(slug).then(setBenchmarkDetail).catch(() => {})
          getBenchmarkSources().then(setBenchmarkSources).catch(() => {})
          getBenchmarkCareers().then(list => setBenchmarkSummary(list.find(c => c.slug === slug) ?? null)).catch(() => {})
          fetch(`/api/benchmark-articles/${slug}`).then(r => r.ok ? r.json() : []).then(setLecturas).catch(() => {})
        }
        if (d.area_conocimiento) {
          getCarrerasPublico({ area: d.area_conocimiento, limit: 8 })
            .then(list => setSimilares(list.filter(c => c.id !== id).slice(0, 5)))
            .catch(() => {})
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
    getVacantesTopSkills(50).then(setVacanteSkills).catch(() => {})
    getTendenciasNacionales(7).then((list: TendenciaNacional[]) => setTendenciaNacional(list[list.length - 1] ?? null)).catch(() => {})
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
      {/* Doble alerta banner */}
      {d.kpi && d.kpi.d1_obsolescencia.score >= 0.6 && benchmarkSummary && benchmarkSummary.urgencia_curricular >= 60 && (
        <div className="mb-5 p-4 rounded-xl bg-red-50 border border-red-200">
          <p className="text-sm font-bold text-red-800 mb-1">⚠ Doble alerta — riesgo local + urgencia global</p>
          <p className="text-xs text-red-700">
            D1 local <span className="font-mono font-semibold">{d.kpi.d1_obsolescencia.score.toFixed(2)}</span> ≥ 0.60
            {' '}y urgencia benchmark <span className="font-mono font-semibold">{benchmarkSummary.urgencia_curricular}</span>/100 — intervención curricular prioritaria.
            {' '}<Link href={`/benchmarks/${benchmarkSummary.slug}`} className="underline hover:text-red-900">Ver benchmark →</Link>
          </p>
        </div>
      )}
      {/* Diagnóstico rápido — solo cuando no hay doble alerta */}
      {d.kpi && !(d.kpi.d1_obsolescencia.score >= 0.6 && benchmarkSummary && benchmarkSummary.urgencia_curricular >= 60) && (() => {
        const d1 = d.kpi.d1_obsolescencia.score
        const d2 = d.kpi.d2_oportunidades.score
        if (d1 < 0.4 && d2 >= 0.6) {
          return (
            <div className="mb-5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2">
              <span className="text-emerald-600 font-bold">✓</span>
              <p className="text-xs text-emerald-800 font-medium">Perfil favorable — baja obsolescencia y alta oportunidad curricular.</p>
            </div>
          )
        }
        if (d2 >= 0.6) {
          return (
            <div className="mb-5 p-3 rounded-xl bg-green-50 border border-green-200 flex items-center gap-2">
              <span className="text-green-600 font-bold">↑</span>
              <p className="text-xs text-green-800 font-medium">Alta oportunidad digital — D2 <span className="font-mono">{d2.toFixed(2)}</span>. Fortalecer habilidades emergentes.</p>
            </div>
          )
        }
        if (d1 >= 0.4 && d1 < 0.6) {
          return (
            <div className="mb-5 p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2">
              <span className="text-amber-600 font-bold">~</span>
              <p className="text-xs text-amber-800 font-medium">Riesgo moderado — D1 <span className="font-mono">{d1.toFixed(2)}</span>. Revisar contenidos con más exposición a automatización.</p>
            </div>
          )
        }
        return null
      })()}
      {/* Breadcrumb + título */}
      <div className="mb-6">
        <Link href="/carreras" className="text-xs text-brand-600 hover:underline">← Carreras</Link>
        <div className="flex items-start justify-between gap-3 mt-2">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-slate-900">{d.nombre}</h1>
            <div className="flex flex-wrap gap-2 mt-2">
              {d.area_conocimiento && <Badge variant="default">{d.area_conocimiento}</Badge>}
              {d.nivel && <Badge variant="neutro">{d.nivel}</Badge>}
              {d.duracion_anios && <Badge variant="neutro">{d.duracion_anios} años</Badge>}
            </div>
          </div>
          <div className="flex gap-2 shrink-0 mt-1">
            <button
              onClick={() => {
                const kpi = d.kpi
                const urgencia = benchmarkSummary?.urgencia_curricular
                const lines = [
                  `📊 Diagnóstico IA — ${d.nombre}`,
                  kpi ? `D1 Obsolescencia: ${kpi.d1_obsolescencia.score.toFixed(2)} | D2 Oportunidades: ${kpi.d2_oportunidades.score.toFixed(2)}` : '',
                  urgencia != null ? `Urgencia curricular global: ${urgencia}/100` : '',
                  `Ver análisis completo: https://oia-ee.mx/carreras/${id}`,
                  'Fuente: OIA-EE — Observatorio de Impacto IA en Educación y Empleo',
                ].filter(Boolean).join('\n')
                navigator.clipboard.writeText(lines).catch(() => {})
              }}
              className="text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded hover:bg-gray-50 transition-colors font-medium whitespace-nowrap"
              title="Copiar resumen diagnóstico"
            >
              Copiar
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`📊 Diagnóstico IA — ${d.nombre}\n${d.kpi ? `D1: ${d.kpi.d1_obsolescencia.score.toFixed(2)} | D2: ${d.kpi.d2_oportunidades.score.toFixed(2)}` : ''}${benchmarkSummary ? ` | Urgencia: ${benchmarkSummary.urgencia_curricular}/100` : ''}\nhttps://oia-ee.mx/carreras/${id}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-green-600 border border-green-200 px-3 py-1.5 rounded hover:bg-green-50 transition-colors font-medium whitespace-nowrap"
            >
              WhatsApp
            </a>
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${d.nombre}${benchmarkSummary ? ` — urgencia curricular ${benchmarkSummary.urgencia_curricular}/100` : ''} — OIA-EE`)}&url=${encodeURIComponent(`https://oia-ee.mx/carreras/${id}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-700 border border-gray-200 px-3 py-1.5 rounded hover:bg-gray-50 transition-colors font-medium whitespace-nowrap"
            >
              X
            </a>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`https://oia-ee.mx/carreras/${id}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 border border-blue-200 px-3 py-1.5 rounded hover:bg-blue-50 transition-colors font-medium whitespace-nowrap"
            >
              LinkedIn
            </a>
          </div>
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
            {tendenciaNacional && (
              <div className="mt-4 pt-3 border-t border-slate-100 flex gap-4 text-[10px] text-slate-400">
                <span>vs. promedio nacional:</span>
                {tendenciaNacional.d1_score != null && (
                  <span className={d.kpi!.d1_obsolescencia.score > tendenciaNacional.d1_score ? 'text-red-600 font-semibold' : 'text-emerald-600 font-semibold'}>
                    D1 {d.kpi!.d1_obsolescencia.score > tendenciaNacional.d1_score ? '▲' : '▼'} {Math.abs(d.kpi!.d1_obsolescencia.score - tendenciaNacional.d1_score).toFixed(2)} {d.kpi!.d1_obsolescencia.score > tendenciaNacional.d1_score ? 'sobre' : 'bajo'} media
                  </span>
                )}
                {tendenciaNacional.d2_score != null && (
                  <span className={d.kpi!.d2_oportunidades.score >= tendenciaNacional.d2_score ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>
                    D2 {d.kpi!.d2_oportunidades.score >= tendenciaNacional.d2_score ? '▲' : '▼'} {Math.abs(d.kpi!.d2_oportunidades.score - tendenciaNacional.d2_score).toFixed(2)} {d.kpi!.d2_oportunidades.score >= tendenciaNacional.d2_score ? 'sobre' : 'bajo'} media
                  </span>
                )}
              </div>
            )}
            {promedioArea && (
              <div className="mt-2 pt-2 border-t border-slate-100 flex gap-4 text-[10px] text-slate-400">
                <span>vs. área ({promedioArea.n} carreras):</span>
                <span className={d.kpi!.d1_obsolescencia.score > promedioArea.d1 ? 'text-red-600 font-semibold' : 'text-emerald-600 font-semibold'}>
                  D1 {d.kpi!.d1_obsolescencia.score > promedioArea.d1 ? '▲' : '▼'} {Math.abs(d.kpi!.d1_obsolescencia.score - promedioArea.d1).toFixed(2)} {d.kpi!.d1_obsolescencia.score > promedioArea.d1 ? 'sobre' : 'bajo'} área
                </span>
                <span className={d.kpi!.d2_oportunidades.score >= promedioArea.d2 ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>
                  D2 {d.kpi!.d2_oportunidades.score >= promedioArea.d2 ? '▲' : '▼'} {Math.abs(d.kpi!.d2_oportunidades.score - promedioArea.d2).toFixed(2)} {d.kpi!.d2_oportunidades.score >= promedioArea.d2 ? 'sobre' : 'bajo'} área
                </span>
              </div>
            )}
            <details className="mt-3 pt-3 border-t border-slate-100">
              <summary className="text-[10px] text-slate-400 cursor-pointer hover:text-slate-600 select-none">
                ¿Qué significan estos indicadores?
              </summary>
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px] text-slate-500 leading-snug">
                <p><span className="font-semibold text-slate-700">D1 Obsolescencia</span> — Fracción del contenido curricular expuesto a automatización. Menor es mejor; ≥ 0.60 requiere intervención.</p>
                <p><span className="font-semibold text-slate-700">D2 Oportunidades</span> — Capacidad del plan de estudios de aprovechar tecnologías emergentes. Mayor es mejor; ≥ 0.60 indica perfil digital sólido.</p>
                <p><span className="font-semibold text-slate-700">D3 Mercado Laboral</span> — Demanda de vacantes activas alineadas con las habilidades de la carrera. Mayor es mejor.</p>
                <p><span className="font-semibold text-slate-700">D6 Perfil Estudiantil</span> — Índice de empleabilidad estimada de los egresados frente al mercado IA. Mayor es mejor.</p>
              </div>
            </details>
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

      {/* Narrativa de impacto IA */}
      {d.kpi && (() => {
        const n = narrativaImpacto(d.kpi, d.nombre, benchmarkSummary, tendenciaNacional)
        const cls = n.color === 'rojo'
          ? 'bg-red-50 border-red-200 text-red-900'
          : n.color === 'ambar'
          ? 'bg-amber-50 border-amber-200 text-amber-900'
          : 'bg-emerald-50 border-emerald-200 text-emerald-900'
        const titleCls = n.color === 'rojo' ? 'text-red-800' : n.color === 'ambar' ? 'text-amber-800' : 'text-emerald-800'
        const accionCls = n.color === 'rojo' ? 'text-red-700' : n.color === 'ambar' ? 'text-amber-700' : 'text-emerald-700'
        return (
          <div className={`mb-6 rounded-xl border p-4 ${cls}`}>
            <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${titleCls}`}>{n.titulo}</p>
            <p className="text-xs leading-relaxed mb-2">{n.texto}</p>
            <p className={`text-xs font-semibold ${accionCls}`}>→ {n.accion}</p>
          </div>
        )
      })()}

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
            <div className="flex items-center gap-3 ml-4 shrink-0">
              {benchmarkSummary && (() => {
                const s = benchmarkSummary.urgencia_curricular
                const cls = s >= 60
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : s >= 30
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-green-50 text-green-700 border-green-200'
                return (
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-semibold ${cls}`}
                    title="Urgencia curricular (0–100): % skills en declive × consenso promedio">
                    Urgencia <span className="font-mono">{s}</span>
                  </span>
                )
              })()}
              {d.benchmark_slug && BENCHMARK_ARTICLE_MAP[d.benchmark_slug] && (
                <Link
                  href={`/investigaciones/${BENCHMARK_ARTICLE_MAP[d.benchmark_slug]}`}
                  className="text-xs text-brand-600 hover:underline font-medium"
                >
                  Leer análisis completo →
                </Link>
              )}
            </div>
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

          {demandaLaboral.length > 0 && (() => {
            const calientesD = demandaLaboral.filter(sk => sk.direccion_global === 'growing')
            const brechaD = demandaLaboral.filter(sk => sk.direccion_global === 'declining')
            const skillPill = (sk: typeof demandaLaboral[0], cls: string) => (
              <Link
                key={sk.skill_id}
                href={`/vacantes?q=${encodeURIComponent(sk.skill_nombre)}`}
                title={`${sk.vacanteCount} vacantes demandan esta skill`}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${cls}`}
              >
                {sk.skill_nombre}
                <span className="text-[10px] ml-0.5 opacity-70">{sk.vacanteCount}</span>
              </Link>
            )
            return (
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                {calientesD.length > 0 && (
                  <div>
                    <p className="text-[10px] text-emerald-600 uppercase tracking-widest font-semibold mb-1.5">
                      ↑ {calientesD.length} skills calientes — crecimiento global + demanda MX
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {calientesD.map(sk => skillPill(sk, 'bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100'))}
                    </div>
                  </div>
                )}
                {brechaD.length > 0 && (
                  <div>
                    <p className="text-[10px] text-amber-600 uppercase tracking-widest font-semibold mb-1.5">
                      ↓ {brechaD.length} skills brecha — declive global pero aún demandadas en MX
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {brechaD.map(sk => skillPill(sk, 'bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100'))}
                    </div>
                  </div>
                )}
              </div>
            )
          })()}
        </Card>
      )}

      {/* Lecturas relacionadas */}
      {lecturas.length > 0 && (
        <Card className="mb-6 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-widest">Lecturas relacionadas</h3>
            {d.benchmark_slug && (
              <Link href={`/investigaciones?benchmark=${d.benchmark_slug}`} className="text-[11px] text-brand-600 hover:underline">
                Más investigaciones →
              </Link>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {lecturas.map(a => (
              <Link
                key={a.slug}
                href={`/investigaciones/${a.slug}`}
                className="border border-slate-100 rounded-lg p-3 hover:border-brand-200 hover:bg-brand-50/20 transition-colors"
              >
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">{a.tipo}</span>
                <p className="text-xs font-medium text-slate-800 leading-snug mt-1 line-clamp-2">{a.titulo}</p>
                <p className="text-[11px] text-slate-400 mt-1.5">{a.tiempo_lectura} · {new Date(a.fecha).toLocaleDateString('es-MX', { month: 'short', year: 'numeric' })}</p>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Top skills nacionales en demanda */}
      {vacanteSkills.length > 0 && (
        <Card className="mb-6 p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-widest">Top skills en vacantes — mercado MX</h3>
            <Link href="/vacantes" className="text-[11px] text-brand-600 hover:underline">Ver vacantes →</Link>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {vacanteSkills.slice(0, 8).map(sf => (
              <Link
                key={sf.nombre}
                href={`/vacantes?q=${encodeURIComponent(sf.nombre)}`}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 border border-indigo-100 text-indigo-800 hover:bg-indigo-100 transition-colors"
              >
                {sf.nombre}
                <span className="text-[10px] opacity-60 ml-0.5">{sf.count}</span>
              </Link>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 mt-2">Vacantes activas en plataformas mexicanas. Número = menciones.</p>
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

      {/* Carreras similares */}
      {similares.length > 0 && (
        <Card className="mb-6 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-widest">
              Otras carreras en {d.area_conocimiento}
            </h3>
            <Link href={`/carreras?area=${encodeURIComponent(d.area_conocimiento ?? '')}`} className="text-[11px] text-brand-600 hover:underline">
              Ver todas →
            </Link>
          </div>
          <div className="space-y-2">
            {similares.map(c => (
              <div key={c.id} className="flex items-center gap-3">
                <Link href={`/carreras/${c.id}`} className="flex-1 text-xs text-slate-700 hover:text-brand-700 hover:underline font-medium truncate">
                  {c.nombre}
                </Link>
                <div className="flex gap-1.5 shrink-0">
                  {c.kpi && (
                    <>
                      <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${c.kpi.d1_obsolescencia.score >= 0.6 ? 'bg-red-50 text-red-700' : c.kpi.d1_obsolescencia.score >= 0.4 ? 'bg-yellow-50 text-yellow-700' : 'bg-green-50 text-green-700'}`}>
                        D1 {c.kpi.d1_obsolescencia.score.toFixed(2)}
                      </span>
                      <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${c.kpi.d2_oportunidades.score >= 0.6 ? 'bg-green-50 text-green-700' : c.kpi.d2_oportunidades.score >= 0.4 ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'}`}>
                        D2 {c.kpi.d2_oportunidades.score.toFixed(2)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Pertinencia CTA */}
      <div className="mt-6 rounded-xl bg-indigo-50 border border-indigo-200 px-4 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-indigo-800">¿Tu institución ofrece esta carrera?</p>
          <p className="text-[11px] text-indigo-600 mt-0.5">Solicita el análisis de pertinencia curricular — diagnóstico personalizado y gratuito en 5 días hábiles.</p>
        </div>
        <Link
          href={`/pertinencia?carrera=${encodeURIComponent(d.nombre)}`}
          className="shrink-0 text-xs font-semibold text-indigo-700 border border-indigo-300 bg-white px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors whitespace-nowrap"
        >
          Solicitar análisis →
        </Link>
      </div>
    </div>
  )
}

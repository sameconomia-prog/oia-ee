// frontend/src/app/page.tsx
'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getResumenPublico, getKpisNacionalResumen, getVacantesTopSkills, getTopRiesgo, getTopOportunidades, getIesPublico } from '@/lib/api'
import type { ResumenPublico, KpisNacionalResumen, SkillFreq, TopRiesgoItem, IesInfo } from '@/lib/types'
import TendenciasNacionalesChart from '@/components/TendenciasNacionalesChart'
import StatCard from '@/components/ui/StatCard'
import Card from '@/components/ui/Card'
import SectionHeader from '@/components/ui/SectionHeader'
import Badge from '@/components/ui/Badge'

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

const IMPACTO_VARIANT: Record<string, 'risk' | 'oportunidad' | 'neutro'> = {
  riesgo: 'risk',
  oportunidad: 'oportunidad',
  neutro: 'neutro',
}

export default function HomePage() {
  const [data, setData] = useState<ResumenPublico | null>(null)
  const [kpisNac, setKpisNac] = useState<KpisNacionalResumen | null>(null)
  const [topSkills, setTopSkills] = useState<SkillFreq[]>([])
  const [topRiesgo, setTopRiesgo] = useState<TopRiesgoItem[]>([])
  const [topOportunidades, setTopOportunidades] = useState<TopRiesgoItem[]>([])
  const [iesList, setIesList] = useState<IesInfo[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getResumenPublico()
      .then(setData)
      .catch((e: Error) => setError(e.message))
    getKpisNacionalResumen().then(setKpisNac).catch(() => {})
    getVacantesTopSkills(12).then(setTopSkills).catch(() => {})
    getTopRiesgo(5).then(setTopRiesgo).catch(() => {})
    getTopOportunidades(5).then(setTopOportunidades).catch(() => {})
    getIesPublico().then(setIesList).catch(() => {})
  }, [])

  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero */}
      <div className="mb-8">
        <div className="inline-block px-3 py-1 rounded-full bg-brand-50 text-brand-600 text-xs font-medium mb-3">
          Plataforma de análisis · México
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          Observatorio de Indicadores<br />
          <span className="text-brand-600">IA · Empleo · Educación</span>
        </h1>
        <p className="text-slate-500 text-sm max-w-xl">
          Monitoreo en tiempo real de tendencias de automatización, riesgo laboral y
          oportunidades de actualización curricular para instituciones de educación superior en México.
        </p>
        <div className="flex gap-3 mt-4">
          <Link
            href="/rector"
            className="px-4 py-2 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-700 transition-colors"
          >
            Acceso rectores →
          </Link>
          <Link
            href="/noticias"
            className="px-4 py-2 border border-slate-200 text-slate-700 text-sm rounded-lg hover:bg-slate-50 transition-colors"
          >
            Ver noticias
          </Link>
        </div>
      </div>

      {error && (
        <p className="text-red-500 text-sm mb-4">Error cargando datos: {error}</p>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard
          label="IES monitoreadas"
          value={data?.total_ies ?? '—'}
          sub="Instituciones activas"
        />
        <StatCard
          label="Noticias analizadas"
          value={data?.total_noticias ?? '—'}
          sub="Con clasificación IA"
          valueClassName="text-slate-800"
        />
        <StatCard
          label="Vacantes IA"
          value={data?.total_vacantes ?? '—'}
          sub="Empleos indexados"
        />
        <StatCard
          label="Alertas activas"
          value={data?.alertas_activas ?? '—'}
          sub="Sin leer por rectores"
          valueClassName={data && data.alertas_activas > 0 ? 'text-red-500' : 'text-slate-800'}
        />
      </div>

      {/* Promedios nacionales KPI */}
      {kpisNac && kpisNac.total_carreras > 0 && (
        <Card className="mb-8 p-5">
          <SectionHeader
            title={`Promedios nacionales · ${kpisNac.total_carreras} carreras`}
            action={
              <div className="flex gap-2 text-xs">
                <Badge variant="risk">{kpisNac.carreras_riesgo_alto} riesgo alto (D1)</Badge>
                <Badge variant="oportunidad">{kpisNac.carreras_oportunidad_alta} alta oportunidad (D2)</Badge>
              </div>
            }
          />
          <div className="grid grid-cols-4 gap-3">
            {([
              { dim: 'D1', label: 'Obsolescencia', val: kpisNac.promedio_d1, invert: true },
              { dim: 'D2', label: 'Oportunidades', val: kpisNac.promedio_d2, invert: false },
              { dim: 'D3', label: 'Mercado Laboral', val: kpisNac.promedio_d3, invert: false },
              { dim: 'D6', label: 'Perfil Estudiantil', val: kpisNac.promedio_d6, invert: false },
            ] as { dim: string; label: string; val: number; invert: boolean }[]).map(({ dim, label, val, invert }) => {
              const good = invert ? val < 0.4 : val >= 0.6
              const warn = val >= 0.4 && val < 0.6
              const color = good ? 'text-emerald-700' : warn ? 'text-yellow-700' : 'text-red-700'
              return (
                <div key={dim} className="text-center p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-xs font-mono font-bold text-slate-500 mb-1">{dim}</p>
                  <p className={`text-xl font-bold font-mono ${color}`}>{val.toFixed(2)}</p>
                  <p className="text-xs text-slate-400 mt-1">{label}</p>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Tendencias nacionales */}
      <TendenciasNacionalesChart dias={30} />

      {/* Feature cards */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        {[
          { href: '/carreras', title: 'Explorar Carreras', desc: 'Busca cualquier carrera y consulta su riesgo D1, oportunidades D2 y más' },
          { href: '/vacantes', title: 'Vacantes IA', desc: 'Empleos que demandan habilidades de inteligencia artificial en México' },
          { href: '/comparar', title: 'Comparar IES', desc: 'Análisis D4 de dos instituciones lado a lado' },
          { href: '/kpis', title: 'Rankings Detallados', desc: 'D1 Obsolescencia · D2 Oportunidades · D3 Mercado · D6 Estudiantil' },
        ].map(({ href, title, desc }) => (
          <Link
            key={href + title}
            href={href}
            className="flex items-start gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-card hover:border-brand-600/40 hover:shadow-md transition-all"
          >
            <div>
              <p className="font-semibold text-slate-800 text-sm mb-0.5">{title}</p>
              <p className="text-xs text-slate-500">{desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Top carreras en riesgo */}
      {topRiesgo.length > 0 && (
        <Card className="mb-8 p-5 border-red-100">
          <SectionHeader
            title="Carreras con mayor riesgo de obsolescencia"
            subtitle="D1 más alto"
            action={<Link href="/kpis" className="text-xs text-brand-600 hover:underline">Ver rankings →</Link>}
          />
          <div className="space-y-2">
            {topRiesgo.map((c, i) => (
              <div key={c.carrera_id} className="flex items-center gap-3">
                <span className="text-xs text-slate-400 font-mono w-4">{i + 1}.</span>
                <Link href={`/carreras/${c.carrera_id}`} className="flex-1 text-sm text-slate-700 hover:text-brand-700 hover:underline">{c.nombre}</Link>
                <div className="flex gap-2">
                  <Badge variant="risk">D1 {c.d1_score.toFixed(2)}</Badge>
                  <Badge variant="neutro">D2 {c.d2_score.toFixed(2)}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Top carreras con oportunidad */}
      {topOportunidades.length > 0 && (
        <Card className="mb-8 p-5 border-emerald-100">
          <SectionHeader
            title="Carreras con mayor oportunidad de actualización"
            subtitle="D2 más alto"
            action={<Link href="/kpis" className="text-xs text-brand-600 hover:underline">Ver rankings →</Link>}
          />
          <div className="space-y-2">
            {topOportunidades.map((c, i) => (
              <div key={c.carrera_id} className="flex items-center gap-3">
                <span className="text-xs text-slate-400 font-mono w-4">{i + 1}.</span>
                <Link href={`/carreras/${c.carrera_id}`} className="flex-1 text-sm text-slate-700 hover:text-brand-700 hover:underline">{c.nombre}</Link>
                <div className="flex gap-2">
                  <Badge variant="neutro">D1 {c.d1_score.toFixed(2)}</Badge>
                  <Badge variant="oportunidad">D2 {c.d2_score.toFixed(2)}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Skills más demandadas */}
      {topSkills.length > 0 && (
        <Card className="mb-8 p-5">
          <SectionHeader title="Skills más demandadas" subtitle="Mercado laboral" />
          <div className="flex flex-wrap gap-2">
            {topSkills.map((s) => (
              <span
                key={s.nombre}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-medium"
              >
                {s.nombre}
                <span className="bg-brand-100 text-brand-800 rounded-full px-1.5 py-0.5 text-[10px] font-bold">
                  {s.count}
                </span>
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Instituciones monitoreadas */}
      {iesList.length > 0 && (
        <Card className="mb-8 p-5">
          <SectionHeader
            title="Instituciones monitoreadas"
            action={<Link href="/ies" className="text-xs text-brand-600 hover:underline">Ver todas →</Link>}
          />
          <div className="flex flex-wrap gap-2">
            {iesList.map(ies => (
              <Link
                key={ies.id}
                href={`/ies/${ies.id}`}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 hover:border-brand-600/40 hover:text-brand-700 hover:bg-brand-50 transition-colors"
              >
                {ies.nombre_corto ?? ies.nombre}
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Noticias recientes */}
      <Card className="mb-8 p-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900 text-sm">Noticias recientes</h2>
          <Link href="/noticias" className="text-xs text-brand-600 hover:underline">Ver todas →</Link>
        </div>
        {!data && !error && (
          <p className="px-5 py-8 text-center text-slate-400 text-sm">Cargando...</p>
        )}
        {data && data.noticias_recientes.length === 0 && (
          <p className="px-5 py-8 text-center text-slate-400 text-sm">Sin noticias aún.</p>
        )}
        {data && data.noticias_recientes.map((n) => (
          <div key={n.id} className="flex items-start gap-3 px-5 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50">
            <div className="flex-1 min-w-0">
              <a
                href={n.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-slate-800 hover:underline line-clamp-1"
              >
                {n.titulo}
              </a>
              <p className="text-xs text-slate-400 mt-0.5">
                {n.fuente} · {n.sector ?? 'sin sector'} · {formatDate(n.fecha_pub)}
              </p>
            </div>
            {n.tipo_impacto && (
              <Badge variant={IMPACTO_VARIANT[n.tipo_impacto] ?? 'neutro'} className="shrink-0">
                {n.tipo_impacto}
              </Badge>
            )}
          </div>
        ))}
      </Card>

      <p className="text-center text-xs text-slate-400 mt-8">
        OIA-EE · Datos procesados con IA · Actualización diaria
      </p>
    </div>
  )
}

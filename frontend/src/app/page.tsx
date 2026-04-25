'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getResumenPublico, getKpisNacionalResumen, getVacantesTopSkills, getTopRiesgo, getIesPublico } from '@/lib/api'
import type { ResumenPublico, KpisNacionalResumen, SkillFreq, TopRiesgoItem, IesInfo } from '@/lib/types'
import TendenciasNacionalesChart from '@/components/TendenciasNacionalesChart'

function StatCard({ label, value, sub, color }: {
  label: string
  value: number | string
  sub?: string
  color: string
}) {
  return (
    <div className={`rounded-xl border p-5 bg-white shadow-sm`}>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

const IMPACTO_COLOR: Record<string, string> = {
  riesgo: 'text-red-600',
  oportunidad: 'text-green-600',
  neutro: 'text-yellow-600',
}

export default function HomePage() {
  const [data, setData] = useState<ResumenPublico | null>(null)
  const [kpisNac, setKpisNac] = useState<KpisNacionalResumen | null>(null)
  const [topSkills, setTopSkills] = useState<SkillFreq[]>([])
  const [topRiesgo, setTopRiesgo] = useState<TopRiesgoItem[]>([])
  const [iesList, setIesList] = useState<IesInfo[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getResumenPublico()
      .then(setData)
      .catch((e: Error) => setError(e.message))
    getKpisNacionalResumen()
      .then(setKpisNac)
      .catch(() => {})
    getVacantesTopSkills(12)
      .then(setTopSkills)
      .catch(() => {})
    getTopRiesgo(5)
      .then(setTopRiesgo)
      .catch(() => {})
    getIesPublico()
      .then(setIesList)
      .catch(() => {})
  }, [])

  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero */}
      <div className="mb-8">
        <div className="inline-block px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium mb-3">
          Plataforma de análisis · México
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Observatorio de Indicadores<br />
          <span className="text-indigo-600">IA · Empleo · Educación</span>
        </h1>
        <p className="text-gray-500 text-sm max-w-xl">
          Monitoreo en tiempo real de tendencias de automatización, riesgo laboral y
          oportunidades de actualización curricular para instituciones de educación superior en México.
        </p>
        <div className="flex gap-3 mt-4">
          <Link
            href="/rector"
            className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Acceso rectores →
          </Link>
          <Link
            href="/noticias"
            className="px-4 py-2 border text-sm rounded-lg hover:bg-gray-50 transition-colors"
          >
            Ver noticias
          </Link>
        </div>
      </div>

      {/* Stats */}
      {error && (
        <p className="text-red-500 text-sm mb-4">Error cargando datos: {error}</p>
      )}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard
          label="IES monitoreadas"
          value={data?.total_ies ?? '—'}
          sub="Instituciones activas"
          color="text-indigo-600"
        />
        <StatCard
          label="Noticias analizadas"
          value={data?.total_noticias ?? '—'}
          sub="Con clasificación IA"
          color="text-gray-800"
        />
        <StatCard
          label="Vacantes IA"
          value={data?.total_vacantes ?? '—'}
          sub="Empleos indexados"
          color="text-indigo-600"
        />
        <StatCard
          label="Alertas activas"
          value={data?.alertas_activas ?? '—'}
          sub="Sin leer por rectores"
          color={data && data.alertas_activas > 0 ? 'text-red-500' : 'text-gray-800'}
        />
      </div>

      {/* Promedios nacionales KPI */}
      {kpisNac && kpisNac.total_carreras > 0 && (
        <div className="mb-8 bg-white rounded-xl border shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800 text-sm">Promedios nacionales · {kpisNac.total_carreras} carreras</h2>
            <div className="flex gap-3 text-xs text-gray-500">
              <span className="text-red-600">{kpisNac.carreras_riesgo_alto} en riesgo alto (D1)</span>
              <span className="text-green-600">{kpisNac.carreras_oportunidad_alta} con alta oportunidad (D2)</span>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {([
              { dim: 'D1', label: 'Obsolescencia', val: kpisNac.promedio_d1, invert: true },
              { dim: 'D2', label: 'Oportunidades', val: kpisNac.promedio_d2, invert: false },
              { dim: 'D3', label: 'Mercado Laboral', val: kpisNac.promedio_d3, invert: false },
              { dim: 'D6', label: 'Perfil Estudiantil', val: kpisNac.promedio_d6, invert: false },
            ] as { dim: string; label: string; val: number; invert: boolean }[]).map(({ dim, label, val, invert }) => {
              const good = invert ? val < 0.4 : val >= 0.6
              const warn = invert ? val >= 0.4 && val < 0.6 : val >= 0.4 && val < 0.6
              const color = good ? 'text-green-700' : warn ? 'text-yellow-700' : 'text-red-700'
              return (
                <div key={dim} className="text-center p-3 bg-gray-50 rounded border">
                  <p className="text-xs font-mono font-bold text-gray-500 mb-1">{dim}</p>
                  <p className={`text-xl font-bold font-mono ${color}`}>{val.toFixed(2)}</p>
                  <p className="text-xs text-gray-400 mt-1">{label}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tendencias nacionales */}
      <TendenciasNacionalesChart dias={30} />

      {/* Feature cards */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        {[
          { href: '/kpis', icon: '📊', title: 'Rankings de Carreras', desc: 'D1 Obsolescencia · D2 Oportunidades · D3 Mercado por carrera' },
          { href: '/vacantes', icon: '💼', title: 'Vacantes IA', desc: 'Empleos que demandan habilidades de inteligencia artificial en México' },
          { href: '/comparar', icon: '⚖️', title: 'Comparar IES', desc: 'Análisis D4 de dos instituciones lado a lado' },
          { href: '/metodologia', icon: '📐', title: 'Metodología', desc: 'Cómo se calculan los indicadores D1–D7' },
        ].map(({ href, icon, title, desc }) => (
          <Link
            key={href + title}
            href={href}
            className="flex items-start gap-3 p-4 bg-white rounded-xl border shadow-sm hover:shadow-md transition-shadow"
          >
            <span className="text-2xl shrink-0">{icon}</span>
            <div>
              <p className="font-semibold text-gray-800 text-sm mb-0.5">{title}</p>
              <p className="text-xs text-gray-500">{desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Top carreras en riesgo */}
      {topRiesgo.length > 0 && (
        <div className="mb-8 bg-white rounded-xl border border-red-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 text-sm mb-3">
            Carreras con mayor riesgo de obsolescencia
            <span className="ml-2 text-xs text-red-600 font-normal">(D1 más alto)</span>
          </h2>
          <div className="space-y-2">
            {topRiesgo.map((c, i) => (
              <div key={c.carrera_id} className="flex items-center gap-3">
                <span className="text-xs text-gray-400 font-mono w-4">{i + 1}.</span>
                <div className="flex-1 text-sm text-gray-700">{c.nombre}</div>
                <div className="flex gap-3 text-xs font-mono">
                  <span className={c.d1_score >= 0.6 ? 'text-red-600 font-bold' : 'text-yellow-600'}>
                    D1 {c.d1_score.toFixed(2)}
                  </span>
                  <span className="text-gray-400">D2 {c.d2_score.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skills más demandadas */}
      {topSkills.length > 0 && (
        <div className="mb-8 bg-white rounded-xl border shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 text-sm mb-3">Skills más demandadas · Mercado laboral</h2>
          <div className="flex flex-wrap gap-2">
            {topSkills.map((s) => (
              <span
                key={s.nombre}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium"
              >
                {s.nombre}
                <span className="bg-indigo-200 text-indigo-800 rounded-full px-1.5 py-0.5 text-[10px] font-bold">
                  {s.count}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Instituciones monitoreadas */}
      {iesList.length > 0 && (
        <div className="mb-8 bg-white rounded-xl border shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 text-sm mb-3">
            Instituciones monitoreadas
          </h2>
          <div className="flex flex-wrap gap-2">
            {iesList.map(ies => (
              <Link
                key={ies.id}
                href={`/ies/${ies.id}`}
                className="px-3 py-1.5 rounded-lg border text-xs text-gray-700 hover:border-indigo-400 hover:text-indigo-700 hover:bg-indigo-50 transition-colors"
              >
                {ies.nombre_corto ?? ies.nombre}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Noticias recientes */}
      <div className="bg-white rounded-xl border shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold text-gray-800 text-sm">Noticias recientes</h2>
          <Link href="/noticias" className="text-xs text-indigo-600 hover:underline">
            Ver todas →
          </Link>
        </div>
        {!data && !error && (
          <p className="px-5 py-8 text-center text-gray-400 text-sm">Cargando...</p>
        )}
        {data && data.noticias_recientes.length === 0 && (
          <p className="px-5 py-8 text-center text-gray-400 text-sm">Sin noticias aún.</p>
        )}
        {data && data.noticias_recientes.map((n) => (
          <div key={n.id} className="flex items-start gap-3 px-5 py-3 border-b last:border-0 hover:bg-gray-50">
            <div className="flex-1 min-w-0">
              <a
                href={n.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-gray-800 hover:underline line-clamp-1"
              >
                {n.titulo}
              </a>
              <p className="text-xs text-gray-400 mt-0.5">
                {n.fuente} · {n.sector ?? 'sin sector'} · {formatDate(n.fecha_pub)}
              </p>
            </div>
            {n.tipo_impacto && (
              <span className={`text-xs font-medium shrink-0 ${IMPACTO_COLOR[n.tipo_impacto] ?? 'text-gray-500'}`}>
                {n.tipo_impacto}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <p className="text-center text-xs text-gray-400 mt-8">
        OIA-EE · Datos procesados con IA · Actualización diaria
      </p>
    </div>
  )
}

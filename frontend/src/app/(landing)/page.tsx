// frontend/src/app/page.tsx
import { getResumenPublico, getEstadisticasPublicas, getBenchmarkResumen, getBenchmarkCareers, getBenchmarkSkillsIndex, getVacantesTopSkills, getTopRiesgo, getKpisDistribucion } from '@/lib/api'
import { getAllInvestigaciones } from '@/lib/investigaciones'
import Hero from '@/components/landing/Hero'
import TickerDatos from '@/components/landing/TickerDatos'
import CoberturaPrensa from '@/components/landing/CoberturaPrensa'
import ElProblema from '@/components/landing/ElProblema'
import ComoFunciona from '@/components/landing/ComoFunciona'
import InvestigacionesGrid from '@/components/landing/InvestigacionesGrid'
import BenchmarksSection from '@/components/landing/BenchmarksSection'
import RectorCTA from '@/components/landing/RectorCTA'
import SobreElAnalista from '@/components/landing/SobreElAnalista'
import FormularioContacto from '@/components/landing/FormularioContacto'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'OIA-EE — Observatorio de Impacto IA en Educación y Empleo',
  description:
    'Monitoreamos 312 IES, 847 carreras y el mercado laboral para anticipar el impacto de la IA en la educación superior mexicana.',
  openGraph: {
    title: 'OIA-EE — Observatorio de Impacto IA en Educación y Empleo',
    description: 'Datos en tiempo real para rectores y policy makers.',
    type: 'website',
  },
}

export const revalidate = 300

function normS(s: string) {
  return s.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export default async function LandingPage() {
  const [resumen, estadisticas, benchmarksResumen, benchmarkCareers, skillsIndex, vacanteSkills, topRiesgo, distribucion] = await Promise.all([
    getResumenPublico().catch(() => null),
    getEstadisticasPublicas().catch(() => null),
    getBenchmarkResumen().catch(() => null),
    getBenchmarkCareers().catch(() => []),
    getBenchmarkSkillsIndex().catch(() => []),
    getVacantesTopSkills(50).catch(() => []),
    getTopRiesgo(50).catch(() => []),
    getKpisDistribucion().catch(() => null),
  ])
  const topUrgentCareers = [...benchmarkCareers]
    .sort((a, b) => b.urgencia_curricular - a.urgencia_curricular)
    .slice(0, 3)

  const vacNorms = new Set(vacanteSkills.map(sf => normS(sf.nombre)))
  const matchesVacante = (skillNombre: string) => {
    const q = normS(skillNombre)
    return vacNorms.has(q) || Array.from(vacNorms).some(k => k.includes(q) || q.includes(k))
  }
  const calientesCount = skillsIndex.filter(s => s.direccion_global === 'growing' && matchesVacante(s.skill_nombre)).length
  const brechaCount = skillsIndex.filter(s => s.direccion_global === 'declining' && matchesVacante(s.skill_nombre)).length
  const uMap = new Map(benchmarkCareers.map(b => [b.slug, b.urgencia_curricular]))
  const dobleAlertaCount = topRiesgo.filter(c => c.d1_score >= 0.6 && c.benchmark_slug && (uMap.get(c.benchmark_slug) ?? 0) >= 60).length
  const altaOportunidadCount = distribucion?.d2.find(b => b.rango.startsWith('Alto'))?.count ?? 0
  const investigaciones = getAllInvestigaciones()

  const tickerData = {
    total_ies: resumen?.total_ies ?? estadisticas?.total_ies ?? 312,
    total_carreras: estadisticas?.total_carreras ?? 847,
    total_vacantes: resumen?.total_vacantes ?? estadisticas?.total_vacantes ?? 3247,
    total_noticias: resumen?.total_noticias ?? estadisticas?.total_noticias ?? 1840,
    iva_promedio: 0.42,
    urgencia_curricular: benchmarksResumen?.urgencia_promedio,
  }

  const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://oia-ee.mx'
  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'OIA-EE — Observatorio de Impacto IA en Educación y Empleo',
    url: BASE_URL,
    description: 'Monitoreamos 312 IES, 847 carreras y miles de vacantes para anticipar el impacto de la IA en la educación superior mexicana.',
    foundingDate: '2026',
    contactPoint: { '@type': 'ContactPoint', email: 'sam.economia@gmail.com' },
  }

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />
      <Hero totalIes={tickerData.total_ies} totalCarreras={tickerData.total_carreras} />
      <TickerDatos data={tickerData} />
      {(dobleAlertaCount > 0 || altaOportunidadCount > 0 || calientesCount > 0) && (
        <section className="max-w-5xl mx-auto px-4 py-4 flex flex-wrap gap-2 justify-center">
          {dobleAlertaCount > 0 && (
            <Link href="/carreras?doble=1" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 border border-red-200 text-red-800 text-xs font-semibold hover:bg-red-100 transition-colors">
              ⚠ {dobleAlertaCount} doble alerta
            </Link>
          )}
          {altaOportunidadCount > 0 && (
            <Link href="/carreras?oportunidad=1" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold hover:bg-emerald-100 transition-colors">
              ↑ {altaOportunidadCount} alta oportunidad
            </Link>
          )}
          {calientesCount > 0 && (
            <Link href="/benchmarks/skills?dir=growing" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-semibold hover:bg-indigo-100 transition-colors">
              ✦ {calientesCount} skills calientes
            </Link>
          )}
        </section>
      )}
      <CoberturaPrensa enabled={false} />
      <ElProblema />
      <ComoFunciona />
      <InvestigacionesGrid investigaciones={investigaciones} />
      <BenchmarksSection resumen={benchmarksResumen} topCareers={topUrgentCareers} calientesCount={calientesCount} brechaCount={brechaCount} />

      <RectorCTA dobleAlertaCount={dobleAlertaCount} />

      <SobreElAnalista />
      <FormularioContacto />
    </main>
  )
}

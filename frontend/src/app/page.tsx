// frontend/src/app/page.tsx
import { getResumenPublico, getEstadisticasPublicas, getBenchmarkResumen, getBenchmarkCareers } from '@/lib/api'
import { getAllInvestigaciones } from '@/lib/investigaciones'
import Hero from '@/components/landing/Hero'
import TickerDatos from '@/components/landing/TickerDatos'
import CoberturaPrensa from '@/components/landing/CoberturaPrensa'
import ElProblema from '@/components/landing/ElProblema'
import ComoFunciona from '@/components/landing/ComoFunciona'
import InvestigacionesGrid from '@/components/landing/InvestigacionesGrid'
import BenchmarksSection from '@/components/landing/BenchmarksSection'
import SobreElAnalista from '@/components/landing/SobreElAnalista'
import FormularioContacto from '@/components/landing/FormularioContacto'
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

export default async function LandingPage() {
  const [resumen, estadisticas, benchmarksResumen, benchmarkCareers] = await Promise.all([
    getResumenPublico().catch(() => null),
    getEstadisticasPublicas().catch(() => null),
    getBenchmarkResumen().catch(() => null),
    getBenchmarkCareers().catch(() => []),
  ])
  const topUrgentCareers = [...benchmarkCareers]
    .sort((a, b) => b.urgencia_curricular - a.urgencia_curricular)
    .slice(0, 3)
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
      <CoberturaPrensa enabled={false} />
      <ElProblema />
      <ComoFunciona />
      <InvestigacionesGrid investigaciones={investigaciones} />
      <BenchmarksSection resumen={benchmarksResumen} topCareers={topUrgentCareers} />
      <SobreElAnalista />
      <FormularioContacto />
    </main>
  )
}

import type { Metadata } from 'next'
import IesPageClient from './client'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const data = await fetch(`${BASE}/publico/ies/${params.id}`, { next: { revalidate: 300 } })
    .then(r => r.ok ? r.json() : null)
    .catch(() => null)
  const nombre = data?.nombre ?? 'Institución'
  const d1 = data?.promedio_d1 != null ? `D1 ${data.promedio_d1.toFixed(2)}` : null
  const description = d1
    ? `Diagnóstico curricular de ${nombre} en OIA-EE. ${d1} — riesgo IA, carreras y KPIs educativos.`
    : `Diagnóstico curricular de ${nombre} en OIA-EE — riesgo IA, carreras y KPIs educativos.`
  return {
    title: `${nombre} — OIA-EE`,
    description,
    openGraph: {
      title: `${nombre} — OIA-EE`,
      description,
      type: 'website',
    },
  }
}

export default function IesPage() {
  return <IesPageClient />
}

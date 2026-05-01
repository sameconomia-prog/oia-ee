import type { Metadata } from 'next'
import CarreraPageClient from './client'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const data = await fetch(`${BASE}/publico/carreras/${params.id}`, { next: { revalidate: 300 } })
    .then(r => r.ok ? r.json() : null)
    .catch(() => null)
  const nombre = data?.nombre ?? 'Carrera'
  const description = `Análisis de impacto IA en ${nombre}: índice de obsolescencia D1, oportunidades D2 y benchmark global de habilidades en OIA-EE.`
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

export default function CarreraPage() {
  return <CarreraPageClient />
}

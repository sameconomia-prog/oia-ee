import type { Metadata } from 'next'
import BenchmarkPageClient from './client'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const data = await fetch(`${BASE}/publico/benchmarks/careers/${params.slug}`, { next: { revalidate: 3600 } })
    .then(r => r.ok ? r.json() : null)
    .catch(() => null)
  const nombre = data?.nombre ?? 'Benchmark'
  const description = `Benchmark global de ${nombre}: convergencia de 5 fuentes internacionales (WEF, McKinsey, CEPAL, Frey-Osborne, Anthropic), skills en declive y en crecimiento, urgencia curricular.`
  return {
    title: `Benchmark ${nombre} — OIA-EE`,
    description,
    openGraph: {
      title: `Benchmark ${nombre} — OIA-EE`,
      description,
      type: 'website',
    },
  }
}

export default function BenchmarkPage() {
  return <BenchmarkPageClient />
}

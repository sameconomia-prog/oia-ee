import { MetadataRoute } from 'next'
import { getAllInvestigaciones } from '@/lib/investigaciones'
import { BENCHMARK_TO_ARTICLE } from '@/lib/benchmark-articles'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://oia-ee.mx'

const BENCHMARK_SLUGS = Object.keys(BENCHMARK_TO_ARTICLE)

export default function sitemap(): MetadataRoute.Sitemap {
  const investigaciones = getAllInvestigaciones()

  const invUrls = investigaciones.map(inv => ({
    url: `${BASE_URL}/investigaciones/${inv.slug}`,
    lastModified: new Date(inv.fecha),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  const benchmarkUrls = BENCHMARK_SLUGS.map(slug => ({
    url: `${BASE_URL}/benchmarks/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }))

  return [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
    { url: `${BASE_URL}/investigaciones`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/benchmarks`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/benchmarks/skills`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/ies`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/carreras`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/pertinencia`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/plataforma`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    ...benchmarkUrls,
    ...invUrls,
  ]
}

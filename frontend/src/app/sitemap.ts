import { MetadataRoute } from 'next'
import { getAllInvestigaciones } from '@/lib/investigaciones'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://oia-ee.mx'

export default function sitemap(): MetadataRoute.Sitemap {
  const investigaciones = getAllInvestigaciones()

  const invUrls = investigaciones.map(inv => ({
    url: `${BASE_URL}/investigaciones/${inv.slug}`,
    lastModified: new Date(inv.fecha),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  return [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
    { url: `${BASE_URL}/investigaciones`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/plataforma`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    ...invUrls,
  ]
}

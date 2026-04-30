import { getInvestigacionBySlug, getAllInvestigaciones, getTipoLabel } from '@/lib/investigaciones'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import LeadMagnetWrapper from '@/components/landing/LeadMagnetWrapper'

interface Props {
  params: { slug: string }
}

export async function generateStaticParams() {
  return getAllInvestigaciones().map(inv => ({ slug: inv.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = getInvestigacionBySlug(params.slug)
  if (!data) return {}
  return {
    title: `${data.meta.titulo} — OIA-EE`,
    description: data.meta.resumen,
    openGraph: { title: data.meta.titulo, description: data.meta.resumen, type: 'article' },
  }
}

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://oia-ee.mx'

export default function InvestigacionDetallePage({ params }: Props) {
  const data = getInvestigacionBySlug(params.slug)
  if (!data) notFound()

  const { meta, content } = data

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: meta.titulo,
    description: meta.resumen,
    datePublished: meta.fecha,
    author: { '@type': 'Person', name: meta.autor ?? 'Samuel Aguilar' },
    publisher: {
      '@type': 'Organization',
      name: 'OIA-EE',
      url: BASE_URL,
    },
    url: `${BASE_URL}/investigaciones/${params.slug}`,
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mb-8">
        <span className="text-[#1D4ED8] text-sm font-semibold uppercase tracking-wide">
          {getTipoLabel(meta.tipo)}
        </span>
        <h1 className="text-3xl font-bold text-gray-900 mt-2 mb-4 leading-tight">{meta.titulo}</h1>
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <span>{new Date(meta.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          <span>·</span>
          <span>{meta.tiempo_lectura} de lectura</span>
        </div>
        <p className="text-gray-600 mt-4 text-lg leading-relaxed border-l-4 border-[#3B82F6] pl-4">
          {meta.resumen}
        </p>
      </div>

      {meta.acceso === 'lead_magnet' && meta.pdf_url && (
        <LeadMagnetWrapper pdfUrl={meta.pdf_url} titulo={meta.titulo} />
      )}

      <article className="prose prose-blue max-w-none mt-8">
        <MDXRemote source={content} />
      </article>
    </main>
  )
}

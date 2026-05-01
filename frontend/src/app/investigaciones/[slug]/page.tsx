import { getInvestigacionBySlug, getAllInvestigaciones, getTipoLabel } from '@/lib/investigaciones'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import LeadMagnetWrapper from '@/components/landing/LeadMagnetWrapper'
import BenchmarkMiniCard from '@/components/benchmarks/BenchmarkMiniCard'
import CopyLinkButton from '@/components/CopyLinkButton'
import { ARTICLE_TO_BENCHMARK } from '@/lib/benchmark-articles'

const BENCHMARK_FROM_ARTICLE = ARTICLE_TO_BENCHMARK

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

const TIPO_COLOR: Record<string, string> = {
  reporte: 'bg-blue-100 text-blue-800',
  analisis: 'bg-purple-100 text-purple-800',
  carta: 'bg-green-100 text-green-800',
  nota: 'bg-yellow-100 text-yellow-800',
  metodologia: 'bg-gray-100 text-gray-800',
}

export default function InvestigacionDetallePage({ params }: Props) {
  const data = getInvestigacionBySlug(params.slug)
  if (!data) notFound()

  const { meta, content } = data
  const benchmarkSlug = BENCHMARK_FROM_ARTICLE[params.slug] ?? null

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: meta.titulo,
    description: meta.resumen,
    datePublished: meta.fecha,
    author: { '@type': 'Person', name: meta.autor ?? 'Samuel Aguilar' },
    publisher: { '@type': 'Organization', name: 'OIA-EE', url: BASE_URL },
    url: `${BASE_URL}/investigaciones/${params.slug}`,
  }

  // Related: same tipo or shared tags, excluding current
  const todos = getAllInvestigaciones()
  const currentTags = new Set(meta.tags ?? [])
  const related = todos
    .filter(i => i.slug !== params.slug)
    .map(i => ({
      ...i,
      score:
        (i.tipo === meta.tipo ? 2 : 0) +
        (i.tags ?? []).filter(t => currentTags.has(t)).length,
    }))
    .filter(i => i.score > 0)
    .sort((a, b) => b.score - a.score || new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    .slice(0, 3)

  const relatedSlugs = new Set([params.slug, ...related.map(i => i.slug)])
  const recientes = todos
    .filter(i => !relatedSlugs.has(i.slug))
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    .slice(0, 3)

  return (
    <main className="max-w-3xl mx-auto px-4 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Link href="/investigaciones" className="text-[#1D4ED8] text-sm hover:underline mb-6 inline-block">
        ← Todas las investigaciones
      </Link>

      <div className="mb-8">
        <span className="text-[#1D4ED8] text-sm font-semibold uppercase tracking-wide">
          {getTipoLabel(meta.tipo)}
        </span>
        <h1 className="text-3xl font-bold text-gray-900 mt-2 mb-4 leading-tight">{meta.titulo}</h1>
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
          <span>{new Date(meta.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          <span>·</span>
          <span>{meta.tiempo_lectura} de lectura</span>
          {meta.autor && <><span>·</span><span>{meta.autor}</span></>}
        </div>
        <p className="text-gray-600 mt-4 text-lg leading-relaxed border-l-4 border-[#3B82F6] pl-4">
          {meta.resumen}
        </p>
        {meta.tags && meta.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {meta.tags.map(tag => (
              <Link
                key={tag}
                href={`/investigaciones?q=${encodeURIComponent(tag)}`}
                className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              >
                {tag}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Share row */}
      <div className="flex items-center gap-2 mb-6">
        <CopyLinkButton url={`${BASE_URL}/investigaciones/${params.slug}`} />
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`${meta.titulo} — OIA-EE\n${BASE_URL}/investigaciones/${params.slug}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-green-700 border border-green-200 px-3 py-1.5 rounded hover:bg-green-50 transition-colors font-medium"
        >
          WhatsApp
        </a>
        <a
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`${BASE_URL}/investigaciones/${params.slug}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 border border-blue-200 px-3 py-1.5 rounded hover:bg-blue-50 transition-colors font-medium"
        >
          LinkedIn
        </a>
      </div>

      {benchmarkSlug && <BenchmarkMiniCard slug={benchmarkSlug} />}

      {meta.acceso === 'lead_magnet' && meta.pdf_url && (
        <LeadMagnetWrapper pdfUrl={meta.pdf_url} titulo={meta.titulo} />
      )}

      <article className="prose prose-blue max-w-none mt-8">
        <MDXRemote source={content} />
      </article>

      {/* CTA para artículos dirigidos a rectores */}
      {meta.tags?.includes('rectores') && (
        <div className="mt-10 rounded-xl bg-indigo-50 border border-indigo-200 p-6">
          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-2">Próximo paso</p>
          <h3 className="text-base font-bold text-indigo-900 mb-2">¿Cómo está la urgencia curricular de tu institución?</h3>
          <p className="text-sm text-indigo-700 mb-4">
            Busca tu IES en el observatorio y revisa el portfolio de urgencia curricular de tus carreras con datos actualizados.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/ies"
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Buscar mi institución →
            </Link>
            <Link
              href="/pertinencia"
              className="inline-flex items-center px-4 py-2 border border-indigo-300 text-indigo-700 text-sm font-semibold rounded-lg hover:bg-indigo-100 transition-colors"
            >
              Solicitar análisis gratuito
            </Link>
          </div>
        </div>
      )}

      {related.length > 0 && (
        <aside className="mt-16 border-t border-gray-100 pt-10">
          <h2 className="text-lg font-bold text-gray-800 mb-6">También te puede interesar</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {related.map(inv => (
              <Link key={inv.slug} href={`/investigaciones/${inv.slug}`}>
                <article className="bg-gray-50 rounded-xl p-4 hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-gray-100 h-full flex flex-col">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full w-fit mb-2 ${TIPO_COLOR[inv.tipo] ?? 'bg-gray-100 text-gray-600'}`}>
                    {getTipoLabel(inv.tipo)}
                  </span>
                  <h3 className="text-sm font-semibold text-gray-800 leading-snug mb-1 flex-grow">{inv.titulo}</h3>
                  <p className="text-xs text-gray-400 mt-auto">{inv.tiempo_lectura} de lectura</p>
                </article>
              </Link>
            ))}
          </div>
        </aside>
      )}

      {recientes.length > 0 && (
        <aside className="mt-10 border-t border-gray-100 pt-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-4">Publicaciones recientes</h2>
          <div className="flex flex-col gap-3">
            {recientes.map(inv => (
              <Link key={inv.slug} href={`/investigaciones/${inv.slug}`} className="group flex items-start gap-3">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full w-fit shrink-0 mt-0.5 ${TIPO_COLOR[inv.tipo] ?? 'bg-gray-100 text-gray-600'}`}>
                  {getTipoLabel(inv.tipo)}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 group-hover:text-[#1D4ED8] transition-colors leading-snug">{inv.titulo}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{new Date(inv.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
              </Link>
            ))}
          </div>
        </aside>
      )}
    </main>
  )
}

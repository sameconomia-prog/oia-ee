import { NextResponse } from 'next/server'
import { BENCHMARK_ALL_ARTICLES } from '@/lib/benchmark-articles'
import { getInvestigacionBySlug } from '@/lib/investigaciones'

export function GET(_: Request, { params }: { params: { slug: string } }) {
  const slugs = BENCHMARK_ALL_ARTICLES[params.slug] ?? []
  const articles = slugs
    .map(s => {
      const data = getInvestigacionBySlug(s)
      if (!data) return null
      return {
        slug: s,
        titulo: data.meta.titulo,
        tipo: data.meta.tipo,
        fecha: data.meta.fecha,
        tiempo_lectura: data.meta.tiempo_lectura,
        resumen: data.meta.resumen,
      }
    })
    .filter(Boolean)

  return NextResponse.json(articles)
}

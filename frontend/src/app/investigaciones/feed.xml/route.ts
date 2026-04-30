import { getAllInvestigaciones } from '@/lib/investigaciones'
import { NextResponse } from 'next/server'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://oia-ee.mx'

export async function GET() {
  const investigaciones = getAllInvestigaciones()

  const items = investigaciones
    .map(
      inv => `
    <item>
      <title><![CDATA[${inv.titulo}]]></title>
      <link>${BASE_URL}/investigaciones/${inv.slug}</link>
      <guid isPermaLink="true">${BASE_URL}/investigaciones/${inv.slug}</guid>
      <description><![CDATA[${inv.resumen}]]></description>
      <pubDate>${new Date(inv.fecha).toUTCString()}</pubDate>
      <category>${inv.tipo}</category>
    </item>`
    )
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>OIA-EE — Investigaciones del Observatorio</title>
    <link>${BASE_URL}/investigaciones</link>
    <description>Reportes, análisis y perspectivas sobre IA, empleo y educación superior en México.</description>
    <language>es-mx</language>
    <atom:link href="${BASE_URL}/investigaciones/feed.xml" rel="self" type="application/rss+xml" />
    ${items}
  </channel>
</rss>`

  return new NextResponse(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  })
}

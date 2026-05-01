import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import readingTime from 'reading-time'

export type TipoInvestigacion = 'reporte' | 'analisis' | 'carta' | 'nota' | 'metodologia'
export type AccesoInvestigacion = 'abierto' | 'lead_magnet'

export interface InvestigacionFrontmatter {
  titulo: string
  tipo: TipoInvestigacion
  fecha: string
  resumen: string
  autor?: string
  cover_image?: string
  tags: string[]
  pdf_url?: string
  acceso: AccesoInvestigacion
}

export interface Investigacion extends InvestigacionFrontmatter {
  slug: string
  tiempo_lectura: string
}

const CONTENT_DIR = path.join(process.cwd(), 'src/content/investigaciones')

export function getAllInvestigaciones(): Investigacion[] {
  if (!fs.existsSync(CONTENT_DIR)) return []
  const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.mdx'))
  return files
    .map(filename => {
      const slug = filename.replace('.mdx', '')
      const fullPath = path.join(CONTENT_DIR, filename)
      const { data, content } = matter(fs.readFileSync(fullPath, 'utf8'))
      const rt = readingTime(content)
      return {
        ...(data as InvestigacionFrontmatter),
        slug,
        tiempo_lectura: `${Math.ceil(rt.minutes)} min`,
      }
    })
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
}

export function getInvestigacionBySlug(slug: string): { meta: Investigacion; content: string } | null {
  const fullPath = path.join(CONTENT_DIR, `${slug}.mdx`)
  if (!fs.existsSync(fullPath)) return null
  const { data, content } = matter(fs.readFileSync(fullPath, 'utf8'))
  const rt = readingTime(content)
  return {
    meta: {
      ...(data as InvestigacionFrontmatter),
      slug,
      tiempo_lectura: `${Math.ceil(rt.minutes)} min`,
    },
    content,
  }
}

export function parseInvestigacionSlug(slug: string): { fecha: string; titulo_slug: string } {
  const match = slug.match(/^(\d{4}-\d{2})-(.+)$/)
  if (!match) return { fecha: '', titulo_slug: slug }
  return { fecha: match[1], titulo_slug: match[2] }
}

export function getTipoLabel(tipo: TipoInvestigacion): string {
  const labels: Record<TipoInvestigacion, string> = {
    reporte: 'Reporte',
    analisis: 'Análisis',
    carta: 'Carta / Op-Ed',
    nota: 'Nota de datos',
    metodologia: 'Metodología',
  }
  return labels[tipo]
}

export function getAccesoLabel(acceso: AccesoInvestigacion): string {
  return acceso === 'abierto' ? 'Lectura libre' : 'PDF descargable'
}

export function getTopTags(limit = 20): Array<{ tag: string; count: number }> {
  const todas = getAllInvestigaciones()
  const freq: Record<string, number> = {}
  for (const inv of todas) {
    for (const tag of inv.tags ?? []) {
      freq[tag] = (freq[tag] ?? 0) + 1
    }
  }
  return Object.entries(freq)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

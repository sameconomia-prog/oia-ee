import type { Noticia, KpiResult, IngestResult } from './types'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export async function getNoticias(
  params: { skip?: number; limit?: number; sector?: string } = {}
): Promise<Noticia[]> {
  const q = new URLSearchParams()
  if (params.skip !== undefined) q.set('skip', String(params.skip))
  if (params.limit !== undefined) q.set('limit', String(params.limit))
  if (params.sector) q.set('sector', params.sector)
  const res = await fetch(`${BASE}/noticias/?${q}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function getKpis(carreraId: number): Promise<KpiResult | null> {
  const res = await fetch(`${BASE}/kpis/carrera/${carreraId}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function postIngestGdelt(adminKey: string): Promise<IngestResult> {
  const res = await fetch(`${BASE}/admin/ingest/gdelt`, {
    method: 'POST',
    headers: { 'X-Admin-Key': adminKey },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

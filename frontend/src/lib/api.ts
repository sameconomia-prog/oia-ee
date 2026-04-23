import type { Noticia, KpiResult, IngestResult, RectorData, AlertasHistorial, SimularInput, SimResult, EscenariosHistorialResult } from './types'
import { getToken } from './auth'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

function authHeaders(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function getNoticias(
  params: { skip?: number; limit?: number; sector?: string } = {}
): Promise<Noticia[]> {
  const q = new URLSearchParams()
  if (params.skip !== undefined) q.set('skip', String(params.skip))
  if (params.limit !== undefined) q.set('limit', String(params.limit))
  if (params.sector) q.set('sector', params.sector)
  const qs = q.toString()
  const res = await fetch(`${BASE}/noticias/${qs ? `?${qs}` : ''}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

export async function getKpis(carreraId: number): Promise<KpiResult | null> {
  const res = await fetch(`${BASE}/kpis/carrera/${carreraId}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

export async function postIngestGdelt(adminKey: string): Promise<IngestResult> {
  const res = await fetch(`${BASE}/admin/ingest/gdelt`, {
    method: 'POST',
    headers: { 'X-Admin-Key': adminKey },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

export async function getRectorData(iesId: string): Promise<RectorData> {
  const res = await fetch(`${BASE}/rector?ies_id=${iesId}`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

export async function getAlertas(
  iesId: string,
  options: { skip?: number; limit?: number } = {}
): Promise<AlertasHistorial> {
  const q = new URLSearchParams({ ies_id: iesId })
  if (options.skip !== undefined) q.set('skip', String(options.skip))
  if (options.limit !== undefined) q.set('limit', String(options.limit))
  const res = await fetch(`${BASE}/alertas?${q}`, { headers: authHeaders() })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

export async function markAlertaRead(alertaId: string): Promise<void> {
  const res = await fetch(`${BASE}/alertas/${alertaId}/leer`, {
    method: 'PUT',
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

export async function postSimular(input: SimularInput): Promise<SimResult> {
  const res = await fetch(`${BASE}/escenarios/simular`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

export async function buscarNoticias(q: string, topK: number = 5): Promise<Noticia[]> {
  const params = new URLSearchParams({ q, top_k: String(topK) })
  const res = await fetch(`${BASE}/noticias/buscar?${params}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

export async function getEscenarios(
  options: { skip?: number; limit?: number } = {}
): Promise<EscenariosHistorialResult> {
  const q = new URLSearchParams()
  if (options.skip !== undefined) q.set('skip', String(options.skip))
  if (options.limit !== undefined) q.set('limit', String(options.limit))
  const qs = q.toString()
  const res = await fetch(`${BASE}/escenarios/${qs ? `?${qs}` : ''}`, { headers: authHeaders() })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

import type { Noticia, KpiResult, IngestResult, RectorData, AlertasHistorial, SimularInput, SimResult, EscenariosHistorialResult, ResumenPublico, IesKpiResult, EstadoKpiResult, NoticiasKpiResult, CarreraKpi, KpisNacionalResumen, SkillFreq, VacantePublico, TopRiesgoItem, TendenciaNacional, CarreraDetalle, IesDetalle, EstadisticasPublicas, KpisDistribucion, VacanteTendencia, ImpactoData, SkillGraphData, TopRiesgoItemOut, PertinenciaReportData } from './types'
import { getToken } from './auth'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

function authHeaders(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function getNoticias(
  params: { skip?: number; limit?: number; sector?: string; impacto?: string } = {}
): Promise<Noticia[]> {
  const q = new URLSearchParams()
  if (params.skip !== undefined) q.set('skip', String(params.skip))
  if (params.limit !== undefined) q.set('limit', String(params.limit))
  if (params.sector) q.set('sector', params.sector)
  if (params.impacto) q.set('impacto', params.impacto)
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

export async function getCarrerasPublico(
  params: { skip?: number; limit?: number; q?: string; area?: string } = {}
): Promise<CarreraKpi[]> {
  const qs = new URLSearchParams()
  if (params.skip !== undefined) qs.set('skip', String(params.skip))
  if (params.limit !== undefined) qs.set('limit', String(params.limit))
  if (params.q) qs.set('q', params.q)
  if (params.area) qs.set('area', params.area)
  const qstr = qs.toString()
  const res = await fetch(`${BASE}/publico/carreras${qstr ? `?${qstr}` : ''}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

export async function getAreasCarreras(): Promise<string[]> {
  const res = await fetch(`${BASE}/publico/carreras/areas`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

export async function getResumenPublico(): Promise<ResumenPublico> {
  const res = await fetch(`${BASE}/publico/resumen`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

export async function getSectoresNoticias(): Promise<string[]> {
  const res = await fetch(`${BASE}/noticias/sectores`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

export async function getNoticiaDetalle(id: string): Promise<Noticia> {
  const res = await fetch(`${BASE}/noticias/${id}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

export async function buscarNoticias(q: string, topK: number = 5): Promise<Noticia[]> {
  const params = new URLSearchParams({ q, top_k: String(topK) })
  const res = await fetch(`${BASE}/noticias/buscar?${params}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

export async function getAdminStatus(adminKey: string): Promise<Record<string, number>> {
  const res = await fetch(`${BASE}/admin/status`, { headers: { 'X-Admin-Key': adminKey } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

export async function postIngestNoticias(adminKey: string): Promise<{ fetched: number; stored: number; classified: number }> {
  const res = await fetch(`${BASE}/admin/ingest/noticias`, {
    method: 'POST',
    headers: { 'X-Admin-Key': adminKey },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

export async function getAdminIes(adminKey: string): Promise<{ id: string; nombre: string; nombre_corto: string | null }[]> {
  const res = await fetch(`${BASE}/admin/ies`, { headers: { 'X-Admin-Key': adminKey } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

export async function postAdminUsuario(
  adminKey: string,
  body: { username: string; password: string; ies_id: string; email?: string }
): Promise<{ id: string; username: string; ies_id: string; activo: boolean; email: string | null }> {
  const res = await fetch(`${BASE}/admin/usuarios`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}))
    throw new Error(detail?.detail ?? `HTTP ${res.status}`)
  }
  return await res.json()
}

export async function postKpiSnapshot(adminKey: string): Promise<{ carreras_procesadas: number; kpis_guardados: number; kpis_actualizados: number }> {
  const res = await fetch(`${BASE}/admin/jobs/kpi-snapshot`, {
    method: 'POST',
    headers: { 'X-Admin-Key': adminKey },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

export async function postTriggerAlertJob(adminKey: string): Promise<{ alertas_creadas: number }> {
  const res = await fetch(`${BASE}/admin/jobs/alertas`, {
    method: 'POST',
    headers: { 'X-Admin-Key': adminKey },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

export async function postSeedDemo(adminKey: string): Promise<Record<string, number>> {
  const res = await fetch(`${BASE}/admin/jobs/seed-demo`, {
    method: 'POST',
    headers: { 'X-Admin-Key': adminKey },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

export async function postClearCache(adminKey: string): Promise<{ ok: boolean }> {
  const res = await fetch(`${BASE}/admin/cache/clear`, {
    method: 'POST',
    headers: { 'X-Admin-Key': adminKey },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

export async function getKpisIes(iesId: string): Promise<IesKpiResult | null> {
  const res = await fetch(`${BASE}/kpis/ies/${iesId}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

export async function getPublicoIes(): Promise<{ id: string; nombre: string; nombre_corto?: string }[]> {
  const res = await fetch(`${BASE}/publico/ies`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

export async function getKpisEstado(estado: string): Promise<EstadoKpiResult> {
  const res = await fetch(`${BASE}/kpis/estado/${encodeURIComponent(estado)}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

export async function getKpisNoticias(): Promise<NoticiasKpiResult> {
  const res = await fetch(`${BASE}/kpis/noticias`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

export async function getKpisHistorico(
  carreraId: string,
  kpi: 'd1_score' | 'd2_score' | 'd3_score' | 'd6_score' = 'd1_score',
  limit = 30
): Promise<import('./types').HistoricoSerie> {
  const params = new URLSearchParams({ kpi, limit: String(limit) })
  const res = await fetch(`${BASE}/kpis/historico/carrera/${carreraId}?${params}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

export async function getKpisNacionalResumen(): Promise<KpisNacionalResumen> {
  const res = await fetch(`${BASE}/publico/kpis/resumen`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

export async function getVacantesTopSkills(top = 10): Promise<SkillFreq[]> {
  const res = await fetch(`${BASE}/publico/vacantes/skills?top=${top}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

export async function getTopRiesgo(n = 5): Promise<TopRiesgoItem[]> {
  const res = await fetch(`${BASE}/publico/kpis/top-riesgo?n=${n}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

export async function getTopOportunidades(n = 5): Promise<TopRiesgoItem[]> {
  const res = await fetch(`${BASE}/publico/kpis/top-oportunidades?n=${n}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

export async function getVacantesPublico(
  params: { sector?: string; q?: string; skip?: number; limit?: number } = {}
): Promise<VacantePublico[]> {
  const qs = new URLSearchParams({ limit: String(params.limit ?? 25) })
  if (params.sector) qs.set('sector', params.sector)
  if (params.q) qs.set('q', params.q)
  if (params.skip) qs.set('skip', String(params.skip))
  const res = await fetch(`${BASE}/publico/vacantes?${qs}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

export async function getCarrerasDeIes(iesId: string): Promise<CarreraKpi[]> {
  const res = await fetch(`${BASE}/publico/ies/${iesId}/carreras`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

export async function getSectoresVacantes(): Promise<string[]> {
  const res = await fetch(`${BASE}/publico/sectores`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

export async function getIesDetalle(iesId: string): Promise<IesDetalle> {
  const res = await fetch(`${BASE}/publico/ies/${iesId}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

export async function getVacanteDetalle(id: string): Promise<VacantePublico> {
  const res = await fetch(`${BASE}/publico/vacantes/${id}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

export async function getCarreraDetalle(carreraId: string): Promise<CarreraDetalle> {
  const res = await fetch(`${BASE}/publico/carreras/${carreraId}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

export async function getIesPublico(params: { q?: string } = {}): Promise<import('./types').IesInfo[]> {
  const qs = params.q ? `?q=${encodeURIComponent(params.q)}` : ''
  const res = await fetch(`${BASE}/publico/ies${qs}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

export async function getTendenciasNacionales(dias = 30): Promise<TendenciaNacional[]> {
  const res = await fetch(`${BASE}/publico/kpis/tendencias?dias=${dias}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

export async function getEstadisticasPublicas(): Promise<EstadisticasPublicas> {
  const res = await fetch(`${BASE}/publico/estadisticas`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

export async function getKpisDistribucion(): Promise<KpisDistribucion> {
  const res = await fetch(`${BASE}/publico/kpis/distribucion`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

export async function getVacantesTendencia(meses = 12): Promise<VacanteTendencia[]> {
  const res = await fetch(`${BASE}/publico/vacantes/tendencia?meses=${meses}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

export async function getNoticiasTendencia(meses = 12): Promise<VacanteTendencia[]> {
  const res = await fetch(`${BASE}/noticias/tendencia?meses=${meses}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

export async function getImpacto(): Promise<ImpactoData> {
  const res = await fetch(`${BASE}/publico/impacto`)
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

export async function getSkillGraph(carreraId: string, topN = 20): Promise<SkillGraphData> {
  const res = await fetch(`${BASE}/carreras/${carreraId}/skill-graph?top_n=${topN}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.json()
}

export async function getPrediccionSemaforo(
  carreraId: string,
): Promise<{ d1_score: number; proyeccion_1a: string; proyeccion_3a: string; proyeccion_5a: string } | null> {
  const res = await fetch(`${BASE}/predicciones/carrera/${carreraId}/semaforo`, { headers: authHeaders() })
  if (res.status === 404 || res.status === 422) return null
  if (!res.ok) return null
  return await res.json()
}

export async function getRankingComparativo(area: string | null, n = 30): Promise<TopRiesgoItemOut[]> {
  const qs = new URLSearchParams({ n: String(n), orden: 'd1' })
  if (area) qs.set('area', area)
  const res = await fetch(`${BASE}/publico/kpis/ranking?${qs}`)
  if (!res.ok) return []
  return await res.json()
}

export async function buscarCarreras(q: string): Promise<{ id: string; nombre: string; area_conocimiento: string | null }[]> {
  const res = await fetch(`${BASE}/publico/carreras?q=${encodeURIComponent(q)}&limit=5`)
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data) ? data : (data.carreras ?? [])
}

export async function fetchPertinenciaReportData(
  carreraId: string,
  solicitud: PertinenciaReportData['solicitud'],
): Promise<PertinenciaReportData> {
  const [detalle, kpisNacional] = await Promise.all([
    getCarreraDetalle(carreraId),
    getKpisNacionalResumen(),
  ])

  const [skills, semaforo, comparables] = await Promise.all([
    getSkillGraph(carreraId, 40).catch(() => null),
    getPrediccionSemaforo(carreraId),
    getRankingComparativo(detalle.area_conocimiento, 30),
  ])

  const matriculaTotal = detalle.instituciones.reduce((s, i) => s + (i.matricula ?? 0), 0)

  return {
    solicitud,
    carrera: {
      id: carreraId,
      nombre: detalle.nombre,
      area_conocimiento: detalle.area_conocimiento,
      nivel: detalle.nivel,
      duracion_anios: detalle.duracion_anios,
      matricula_total: matriculaTotal || null,
      instituciones_count: detalle.instituciones.length,
    },
    kpi: detalle.kpi,
    skills,
    semaforo: semaforo ? {
      d1_score: semaforo.d1_score,
      proyeccion_1a: semaforo.proyeccion_1a,
      proyeccion_3a: semaforo.proyeccion_3a,
      proyeccion_5a: semaforo.proyeccion_5a,
    } : null,
    comparables,
    nacional: {
      promedio_d1: kpisNacional.promedio_d1,
      promedio_d2: kpisNacional.promedio_d2,
      promedio_d3: kpisNacional.promedio_d3,
    },
  }
}

// ── Benchmark Global ──────────────────────────────────────────────────────────

export async function getBenchmarkSources(): Promise<import('./types').BenchmarkSource[]> {
  const res = await fetch(`${BASE}/publico/benchmarks/sources`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function getBenchmarkCareers(): Promise<import('./types').BenchmarkCareerSummary[]> {
  const res = await fetch(`${BASE}/publico/benchmarks/careers`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function getBenchmarkCareerDetail(slug: string): Promise<import('./types').BenchmarkCareerDetail> {
  const res = await fetch(`${BASE}/publico/benchmarks/careers/${slug}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function getBenchmarkResumen(): Promise<import('./types').BenchmarkResumen> {
  const res = await fetch(`${BASE}/publico/benchmarks/resumen`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function getBenchmarkSkillCrossSource(skillId: string): Promise<import('./types').SkillCrossSource> {
  const res = await fetch(`${BASE}/publico/benchmarks/skills/${skillId}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function marcarTodasAlertas(): Promise<{ marcadas: number }> {
  const res = await fetch(`${BASE}/alertas/leer-todas`, {
    method: 'PUT',
    headers: { ...authHeaders() },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

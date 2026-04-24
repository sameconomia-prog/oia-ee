export interface HistoricoPoint {
  fecha: string
  valor: number
}

export interface HistoricoSerie {
  carrera_id: string
  kpi_nombre: string
  serie: HistoricoPoint[]
}

export interface Noticia {
  id: number
  titulo: string
  url: string
  fuente: string
  contenido: string
  fecha_pub: string
  pais: string | null
  sector: string | null
  tipo_impacto: string | null
}

export interface D1Result {
  score: number
  iva: number
  bes: number
  vac: number
}

export interface D2Result {
  score: number
  ioe: number
  ihe: number
  iea: number
}

export interface D3Result {
  score: number
  tdm: number
  tvc: number
  brs: number
  ice: number
}

export interface D6Result {
  score: number
  iei: number
  crc: number
  roi_e: number
}

export interface KpiResult {
  carrera_id?: string
  d1_obsolescencia: D1Result
  d2_oportunidades: D2Result
  d3_mercado: D3Result
  d6_estudiantil: D6Result
}

export interface IngestResult {
  fetched: number
  stored: number
  classified: number
  embedded: number
}

export interface IesInfo {
  id: string
  nombre: string
  nombre_corto: string | null
}

export interface CarreraKpi {
  id: string
  nombre: string
  matricula: number | null
  kpi: KpiResult | null
}

export interface AlertaItem {
  id: string
  carrera_nombre: string
  tipo: 'd1_alto' | 'd2_bajo' | 'ambos'
  severidad: 'alta' | 'media'
  titulo: string
  mensaje: string | null
  fecha: string
}

export interface RectorData {
  ies: IesInfo
  carreras: CarreraKpi[]
  alertas: AlertaItem[]
}

export interface AlertaDB {
  id: string
  ies_id: string
  carrera_id: string
  carrera_nombre: string
  tipo: 'd1_alto' | 'd2_bajo' | 'ambos'
  severidad: 'alta' | 'media'
  titulo: string
  mensaje: string | null
  fecha: string
  leida: boolean
}

export interface AlertasHistorial {
  alertas: AlertaDB[]
  total: number
}

export interface SimularInput {
  ies_id: string
  carrera_id: string
  carrera_nombre: string
  iva: number
  bes: number
  vac: number
  ioe: number
  ihe: number
  iea: number
}

export interface SimResult {
  id: string
  carrera_nombre: string
  d1_score: number
  d2_score: number
  iva: number
  bes: number
  vac: number
  ioe: number
  ihe: number
  iea: number
  fecha: string
}

export interface EscenarioHistorial {
  id: string
  carrera_nombre: string
  carrera_id: string
  d1_score: number
  d2_score: number
  iva: number
  bes: number
  vac: number
  ioe: number
  ihe: number
  iea: number
  fecha: string
}

export interface EscenariosHistorialResult {
  escenarios: EscenarioHistorial[]
  total: number
}

export interface ResumenPublico {
  total_ies: number
  total_noticias: number
  alertas_activas: number
  noticias_recientes: Noticia[]
}

export interface D4Result {
  tra: number
  irf: number
  cad: number
  score: number
}

export interface IesKpiResult {
  ies_id: string
  d4_institucional: D4Result
}

export interface D5Result {
  idr: number
  icg: number
  ies_s: number
  score: number
}

export interface EstadoKpiResult {
  estado: string
  d5_geografia: D5Result
}

export interface D7Result {
  isn: number
  vdm: number
  score: number
}

export interface NoticiasKpiResult {
  d7_noticias: D7Result
}

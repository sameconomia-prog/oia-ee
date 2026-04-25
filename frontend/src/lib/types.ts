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
  id: string
  titulo: string
  url: string
  fuente: string | null
  fecha_pub: string | null
  fecha_ingesta: string | null
  pais: string | null
  sector: string | null
  tipo_impacto: string | null
  resumen_claude?: string | null
  causa_ia?: string | null
  n_empleados?: number | null
  empresa?: string | null
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
  total_carreras?: number
  promedio_d1?: number | null
  promedio_d2?: number | null
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
  total_vacantes: number
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

export interface KpisNacionalResumen {
  total_carreras: number
  promedio_d1: number
  promedio_d2: number
  promedio_d3: number
  promedio_d6: number
  carreras_riesgo_alto: number
  carreras_oportunidad_alta: number
}

export interface SkillFreq {
  nombre: string
  count: number
}

export interface TopRiesgoItem {
  carrera_id: string
  nombre: string
  d1_score: number
  d2_score: number
  matricula: number | null
}

export interface IesDetalle {
  id: string
  nombre: string
  nombre_corto: string | null
  total_carreras: number
  promedio_d1: number
  promedio_d2: number
  carreras_riesgo_alto: number
}

export interface CarreraIesItem {
  ies_id: string
  ies_nombre: string
  matricula: number | null
  ciclo: string | null
}

export interface CarreraDetalle {
  id: string
  nombre: string
  kpi: KpiResult | null
  instituciones: CarreraIesItem[]
}

export interface TendenciaNacional {
  fecha: string
  d1_score: number | null
  d2_score: number | null
  d3_score: number | null
  d6_score: number | null
}

export interface VacantePublico {
  id: string
  titulo: string
  empresa: string | null
  sector: string | null
  skills: string[]
  salario_min: number | null
  salario_max: number | null
  estado: string | null
  nivel_educativo: string | null
  experiencia_anios: number | null
  fecha_pub: string | null
}

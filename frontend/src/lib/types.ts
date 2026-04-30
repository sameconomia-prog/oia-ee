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
  area_conocimiento?: string | null
  matricula: number | null
  kpi: KpiResult | null
  benchmark_slug?: string | null
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
  area_conocimiento: string | null
  nivel: string | null
  duracion_anios: number | null
  kpi: KpiResult | null
  instituciones: CarreraIesItem[]
  benchmark_slug: string | null
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

export interface EstadisticasPublicas {
  total_ies: number
  total_carreras: number
  total_vacantes: number
  total_noticias: number
  alertas_activas: number
  top_skills: string[]
}

export interface KpisBin {
  rango: string
  min_val: number
  max_val: number
  count: number
}

export interface KpisDistribucion {
  d1: KpisBin[]
  d2: KpisBin[]
}

export interface VacanteTendencia {
  mes: string
  count: number
}

export interface ImpactoResumen {
  total_noticias_despido: number
  total_empleados_afectados: number
  total_noticias_positivas: number
  total_vacantes_ia: number
}

export interface ImpactoSector {
  sector: string
  noticias: number
  empleados: number
}

export interface ImpactoPais {
  pais: string
  noticias: number
  empleados: number
}

export interface ImpactoCausa {
  causa: string
  count: number
}

export interface ImpactoEventoDespido {
  id: string
  empresa: string | null
  titulo: string
  n_empleados: number | null
  sector: string | null
  pais: string | null
  causa_ia: string | null
  fecha: string
  url: string
}

export interface ImpactoNoticiaPositiva {
  id: string
  titulo: string
  empresa: string | null
  sector: string | null
  tipo_impacto: string | null
  pais: string | null
  fecha: string
  url: string
  resumen: string | null
}

export interface ImpactoVacanteSector {
  sector: string
  count: number
}

export interface ImpactoSkill {
  skill: string
  count: number
}

export interface ImpactoOcupacion {
  nombre: string
  p_automatizacion: number
  p_augmentacion: number
  sector: string | null
  salario_mediana_usd: number | null
}

export interface ImpactoPositivoSector {
  sector: string
  noticias: number
}

export interface ImpactoData {
  resumen: ImpactoResumen
  despidos_por_sector: ImpactoSector[]
  despidos_por_pais: ImpactoPais[]
  despidos_por_causa_ia: ImpactoCausa[]
  top_eventos_despido: ImpactoEventoDespido[]
  noticias_positivas_recientes: ImpactoNoticiaPositiva[]
  positivos_por_sector: ImpactoPositivoSector[]
  vacantes_por_sector: ImpactoVacanteSector[]
  vacantes_por_nivel_educativo: { nivel: string; count: number }[]
  top_skills_demandados: ImpactoSkill[]
  ocupaciones_mayor_riesgo: ImpactoOcupacion[]
  ocupaciones_mayor_oportunidad: ImpactoOcupacion[]
}

export interface TopRiesgoItemOut {
  carrera_id: string
  nombre: string
  d1_score: number
  d2_score: number
  matricula: number | null
  area_conocimiento: string | null
}

export interface PertinenciaSolicitud {
  nombre_contacto: string
  ies_nombre: string
  carrera_nombre: string
  fecha_solicitud: string
}

export interface PertinenciaCarrera {
  id: string
  nombre: string
  area_conocimiento: string | null
  nivel: string | null
  duracion_anios: number | null
  matricula_total: number | null
  instituciones_count: number
}

export interface PertinenciaSemaforo {
  d1_score: number
  proyeccion_1a: string
  proyeccion_3a: string
  proyeccion_5a: string
}

export interface PertinenciaReportData {
  solicitud: PertinenciaSolicitud
  carrera: PertinenciaCarrera
  kpi: KpiResult | null
  skills: SkillGraphData | null
  semaforo: PertinenciaSemaforo | null
  comparables: TopRiesgoItemOut[]
  nacional: { promedio_d1: number; promedio_d2: number; promedio_d3: number }
}

export type IaLabel = 'automated' | 'augmented' | 'resilient'

export interface SkillNode {
  name: string
  weight: number
  ia_score: number
  ia_label: IaLabel
  trend_12m: number
}

export interface SkillGraphData {
  carrera_id: string
  carrera_nombre: string | null
  skill_count: number
  pct_en_transicion: number
  skills: SkillNode[]
}


// ── Benchmark Global types ────────────────────────────────────────────────────

export interface BenchmarkSource {
  id: string
  nombre: string
  año: number
  metodologia: string
  tipo_evidencia: 'prediccion' | 'observacion' | 'regional'
  dato_clave: string
  confianza: 'alta' | 'media' | 'baja'
  peso_geografico: string
  url: string
}

export interface BenchmarkCareerSummary {
  slug: string
  nombre: string
  area: string
  total_skills: number
  skills_declining: number
  skills_growing: number
  skills_mixed: number
  skills_sin_datos: number
  urgencia_curricular: number
}

export type ConvergenceDirection =
  | 'declining' | 'growing' | 'stable' | 'mixed' | 'sin_datos'

export type AccionCurricular =
  | 'retirar' | 'redisenar' | 'fortalecer' | 'agregar'

export interface SkillConvergencia {
  skill_id: string
  skill_nombre: string
  skill_tipo: 'tecnica' | 'transversal' | 'digital' | 'social'
  accion_curricular: AccionCurricular
  convergencia_por_fuente: Record<string, ConvergenceDirection | null>
  direccion_global: ConvergenceDirection
  horizonte_dominante: 'corto' | 'medio' | 'largo' | null
  fuentes_con_datos: number
  consenso_pct: number
}

export interface BenchmarkCareerDetail {
  slug: string
  nombre: string
  area: string
  skills: SkillConvergencia[]
}

export interface BenchmarkResumen {
  total_carreras: number
  total_fuentes: number
  total_skills: number
  skills_declining: number
  skills_growing: number
  skills_mixed_stable: number
  skills_sin_datos: number
  acciones: Record<string, number>
}

export interface SkillHallazgo {
  fuente_id: string
  fuente_nombre: string
  direccion: ConvergenceDirection
  horizonte_impacto: string
  hallazgo: string
  dato_clave: string
  cita_textual: string
}

export interface SkillCrossSource {
  skill_id: string
  hallazgos: SkillHallazgo[]
}

export interface SkillIndexItem {
  skill_id: string
  skill_nombre: string
  skill_tipo: string
  direccion_global: ConvergenceDirection
  fuentes_con_datos: number
  consenso_pct: number
  carreras: string[]
}

export interface SourceHallazgo {
  career_slug: string
  career_nombre: string
  skill_id: string
  skill_nombre: string
  skill_tipo: string
  direccion: ConvergenceDirection
  horizonte_impacto: string
  hallazgo: string
  dato_clave: string
  cita_textual: string
}

export interface SourceDetail extends BenchmarkSource {
  total_hallazgos: number
  hallazgos: SourceHallazgo[]
}

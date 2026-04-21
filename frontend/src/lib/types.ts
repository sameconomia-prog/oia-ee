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

export interface KpiResult {
  d1_obsolescencia: D1Result
  d2_oportunidades: D2Result
}

export interface IngestResult {
  fetched: number
  stored: number
  classified: number
  embedded: number
}

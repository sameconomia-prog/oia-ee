/** Maps benchmark career slug → primary investigaciones article slug */
export const BENCHMARK_TO_ARTICLE: Record<string, string> = {
  'derecho': '2026-04-derecho-ia-2030',
  'medicina': '2026-04-medicina-ia-mexico',
  'arquitectura': '2026-04-arquitectura-ia-2030',
  'enfermeria': '2026-04-enfermeria-ia-2030',
  'mercadotecnia': '2026-04-mercadotecnia-ia-2030',
  'psicologia': '2026-04-psicologia-ia-2030',
  'administracion-empresas': '2026-04-administracion-ia-2030',
  'contaduria': '2026-04-contaduria-ia-2030',
  'diseno-grafico': '2026-04-diseno-grafico-ia-2030',
  'ingenieria-sistemas': '2026-04-ingenieros-software-ia',
  'comunicacion': '2026-04-comunicacion-ia-2030',
  'economia': '2026-04-economia-ia-2030',
  'educacion': '2026-04-educacion-ia-2030',
  'turismo': '2026-04-turismo-ia-2030',
  'ciencias-politicas': '2026-04-ciencias-politicas-ia-2030',
  'nutricion': '2026-04-nutricion-ia-2030',
  'ingenieria-civil': '2026-04-ingenieria-civil-ia-2030',
}

/**
 * All articles (primary + secondary) related to each benchmark career.
 * First entry is always the primary article from BENCHMARK_TO_ARTICLE.
 */
export const BENCHMARK_ALL_ARTICLES: Record<string, string[]> = {
  'derecho': ['2026-04-derecho-ia-2030', '2026-05-derecho-ia-mexico-2030'],
  'medicina': ['2026-04-medicina-ia-mexico'],
  'arquitectura': ['2026-04-arquitectura-ia-2030', '2026-05-arquitectura-ia-diseno-computacional'],
  'enfermeria': ['2026-04-enfermeria-ia-2030', '2026-05-enfermeria-ia-cuidado-humano'],
  'mercadotecnia': ['2026-04-mercadotecnia-ia-2030', '2026-05-mercadotecnia-ia-contenido-datos'],
  'psicologia': ['2026-04-psicologia-ia-2030', '2026-05-psicologia-ia-salud-mental-futuro'],
  'administracion-empresas': ['2026-04-administracion-ia-2030', '2026-05-administracion-negocios-ia-liderazgo'],
  'contaduria': ['2026-04-contaduria-ia-2030', '2026-05-contaduria-sat-digital-automatizacion'],
  'diseno-grafico': ['2026-04-diseno-grafico-ia-2030', '2026-05-diseno-grafico-ia-oportunidad-amenaza'],
  'ingenieria-sistemas': ['2026-04-ingenieros-software-ia', '2026-05-ingenieria-ia-panorama'],
  'comunicacion': ['2026-04-comunicacion-ia-2030', '2026-05-comunicacion-periodismo-ia-contenido'],
  'economia': ['2026-04-economia-ia-2030', '2026-05-economia-que-aprenden-economistas-ia'],
  'educacion': ['2026-04-educacion-ia-2030', '2026-05-ia-docentes-guia-practica'],
  'turismo': ['2026-04-turismo-ia-2030', '2026-05-turismo-hospitalidad-ia-resiliencia'],
  'ciencias-politicas': ['2026-04-ciencias-politicas-ia-2030', '2026-05-ciencias-politicas-ia-poder-datos'],
  'nutricion': ['2026-04-nutricion-ia-2030', '2026-05-nutricion-alimentos-ia-personalizacion'],
  'ingenieria-civil': ['2026-04-ingenieria-civil-ia-2030', '2026-05-ingenieria-civil-ia-infraestructura'],
}

/** Human-readable label for each benchmark career slug */
export const BENCHMARK_LABELS: Record<string, string> = {
  'administracion-empresas': 'Administración',
  'arquitectura': 'Arquitectura',
  'ciencias-politicas': 'Ciencias Políticas',
  'comunicacion': 'Comunicación',
  'contaduria': 'Contaduría',
  'derecho': 'Derecho',
  'diseno-grafico': 'Diseño Gráfico',
  'economia': 'Economía',
  'educacion': 'Educación',
  'enfermeria': 'Enfermería',
  'ingenieria-civil': 'Ing. Civil',
  'ingenieria-sistemas': 'Ing. Sistemas',
  'medicina': 'Medicina',
  'mercadotecnia': 'Mercadotecnia',
  'nutricion': 'Nutrición',
  'psicologia': 'Psicología',
  'turismo': 'Turismo',
}

/** Inverse map: all article slugs (primary + secondary) → benchmark career slug */
export const ARTICLE_TO_BENCHMARK: Record<string, string> = (() => {
  const map: Record<string, string> = {}
  for (const [benchmarkSlug, articles] of Object.entries(BENCHMARK_ALL_ARTICLES)) {
    for (const article of articles) {
      map[article] = benchmarkSlug
    }
  }
  return map
})()

/** Maps benchmark career slug → investigaciones article slug */
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

/** Inverse map: investigaciones article slug → benchmark career slug */
export const ARTICLE_TO_BENCHMARK: Record<string, string> = Object.fromEntries(
  Object.entries(BENCHMARK_TO_ARTICLE).map(([slug, article]) => [article, slug])
)

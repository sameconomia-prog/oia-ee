import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Guía de uso — OIA-EE',
  description: 'Cómo usar el Observatorio de Impacto IA en Educación y Empleo: datos, benchmarks, carreras, investigaciones y diagnóstico de pertinencia curricular.',
}

const PATHS = [
  {
    href: '/ies',
    title: 'Busca tu institución',
    desc: 'Encuentra tu IES en el observatorio y revisa el D1/D2 promedio de su portafolio de carreras. Punto de partida si eres rector o coordinador.',
    badge: 'IES',
    color: 'bg-indigo-50 border-indigo-200 hover:border-indigo-400',
    badgeColor: 'bg-indigo-100 text-indigo-800',
  },
  {
    href: '/carreras',
    title: 'Explora carreras por indicadores',
    desc: 'Lista de todas las carreras registradas con KPIs D1–D6. Filtra por riesgo alto, alta oportunidad o busca por nombre.',
    badge: 'Carreras',
    color: 'bg-blue-50 border-blue-200 hover:border-blue-400',
    badgeColor: 'bg-blue-100 text-blue-800',
  },
  {
    href: '/benchmarks',
    title: 'Benchmarks internacionales',
    desc: '17 carreras analizadas contra 5 fuentes globales (WEF, McKinsey, CEPAL, Frey-Osborne, Anthropic). Urgencia curricular, skills en declive y en crecimiento.',
    badge: 'Benchmarks',
    color: 'bg-purple-50 border-purple-200 hover:border-purple-400',
    badgeColor: 'bg-purple-100 text-purple-800',
  },
  {
    href: '/comparar',
    title: 'Compara dos instituciones',
    desc: 'Selecciona dos IES y ve sus indicadores side-by-side por carrera en común. Útil para posicionamiento competitivo.',
    badge: 'Comparar',
    color: 'bg-teal-50 border-teal-200 hover:border-teal-400',
    badgeColor: 'bg-teal-100 text-teal-800',
  },
  {
    href: '/investigaciones',
    title: 'Investigaciones del observatorio',
    desc: 'Análisis, reportes y guías sobre IA, empleo y educación superior en México. Hay una sección especial para rectores y directivos académicos.',
    badge: 'Investigaciones',
    color: 'bg-emerald-50 border-emerald-200 hover:border-emerald-400',
    badgeColor: 'bg-emerald-100 text-emerald-800',
  },
  {
    href: '/pertinencia',
    title: 'Solicitar diagnóstico gratuito',
    desc: 'Estudio de pertinencia curricular personalizado para una carrera de tu institución: D1–D6, matriz skill-por-skill y recomendaciones. Sin costo.',
    badge: 'Diagnóstico',
    color: 'bg-amber-50 border-amber-200 hover:border-amber-400',
    badgeColor: 'bg-amber-100 text-amber-800',
  },
]

const GUIDES = [
  { href: '/investigaciones/2026-05-que-mide-el-d1-explicacion-directa', label: 'Qué mide exactamente el D1 y por qué es más útil que un consultor', group: 'Fundamentos' },
  { href: '/investigaciones/2026-05-tres-senales-carrera-necesita-actualizacion', label: '3 señales de que tu carrera necesita actualización — ahora', group: 'Diagnóstico' },
  { href: '/investigaciones/2026-05-como-leer-diagnostico-d1-d6-sin-datos', label: 'Cómo leer el diagnóstico D1–D6 sin experiencia en datos', group: 'Diagnóstico' },
  { href: '/investigaciones/2026-05-error-comun-interpretar-d1', label: 'El error más común al interpretar el D1', group: 'Diagnóstico' },
  { href: '/investigaciones/2026-05-semestre-actualizacion-d1-en-6-meses', label: 'El semestre de actualización: cómo mejorar el D1 en 6 meses', group: 'Acción' },
  { href: '/investigaciones/2026-05-presentar-d1-consejo-academico', label: 'Cómo presentar el D1 al Consejo Académico', group: 'Acción' },
  { href: '/investigaciones/2026-05-costo-real-no-actualizar-matricula', label: 'El costo real de no actualizar: cómo se pierde la matrícula', group: 'Acción' },
  { href: '/investigaciones/2026-05-kpis-medir-actualizacion-curricular', label: 'Los 4 KPIs para saber si la actualización curricular ya funcionó', group: 'Medición' },
]

export default function GuiaPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-16">
      <Link href="/" className="text-xs text-indigo-600 hover:underline mb-6 inline-block">← Inicio</Link>

      <div className="mb-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Empieza aquí: cómo usar el OIA-EE</h1>
        <p className="text-gray-500 text-lg max-w-2xl leading-relaxed">
          El Observatorio de Impacto IA en Educación y Empleo centraliza datos sobre
          el riesgo de automatización en carreras universitarias de México. Esta guía
          te lleva al recurso correcto según lo que buscas.
        </p>
      </div>

      <section className="mb-14">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-5">¿Qué quieres hacer?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PATHS.map(p => (
            <Link key={p.href} href={p.href}>
              <article className={`rounded-xl border p-5 h-full transition-all ${p.color}`}>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.badgeColor} mb-3 inline-block`}>{p.badge}</span>
                <h3 className="font-bold text-gray-900 text-base mb-1.5 leading-snug">{p.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{p.desc}</p>
              </article>
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-14">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-5">¿Qué significan los indicadores?</h2>
        <div className="bg-gray-50 rounded-xl border border-gray-100 divide-y divide-gray-100">
          {[
            { d: 'D1', name: 'Obsolescencia', desc: 'Fracción del currículo con sustitutos automatizados. Menor = mejor. Umbral de atención: 0.50. De intervención: 0.60.' },
            { d: 'D2', name: 'Oportunidades digitales', desc: 'Potencial de crecimiento de la carrera en el mercado digital/IA. Mayor = mejor.' },
            { d: 'D3', name: 'Mercado laboral', desc: 'Alineación con la demanda real de vacantes en México. Mayor = mejor.' },
            { d: 'D6', name: 'Perfil estudiantil', desc: 'Correlación entre lo que se forma y lo que el mercado laboral busca. Mayor = mejor.' },
          ].map(item => (
            <div key={item.d} className="flex items-start gap-4 px-5 py-4">
              <span className="shrink-0 font-mono font-bold text-indigo-700 text-sm w-8">{item.d}</span>
              <div>
                <p className="text-sm font-semibold text-gray-800">{item.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <Link href="/investigaciones/2026-05-como-leer-diagnostico-d1-d6-sin-datos" className="text-xs text-indigo-600 hover:underline mt-2 inline-block">
          Guía completa: cómo leer el diagnóstico D1–D6 →
        </Link>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-5">Lecturas recomendadas para rectores</h2>
        {(['Fundamentos', 'Diagnóstico', 'Acción', 'Medición'] as const).map(grp => (
          <div key={grp} className="mb-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{grp}</p>
            <div className="flex flex-col gap-2">
              {GUIDES.filter(g => g.group === grp).map(g => (
                <Link key={g.href} href={g.href} className="group flex items-center gap-2">
                  <span className="text-xs text-gray-400 group-hover:text-indigo-500 transition-colors">→</span>
                  <span className="text-sm text-gray-700 group-hover:text-indigo-700 transition-colors">{g.label}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
        <Link href="/investigaciones?q=rectores" className="text-xs text-indigo-600 hover:underline mt-1">
          Ver todas las investigaciones para rectores →
        </Link>
      </section>
    </main>
  )
}

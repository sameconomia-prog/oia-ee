'use client'
import Link from 'next/link'

const FEATURES = [
  {
    icon: '📊',
    title: 'KPIs D1–D7 en tiempo real',
    desc: 'Obsolescencia, oportunidades, mercado laboral, institucional, geografía y perfil estudiantil actualizados con datos públicos IMSS, ENOE, OCC y ANUIES.',
  },
  {
    icon: '🤖',
    title: 'Mapa de Impacto IA por Carrera',
    desc: 'Treemap de skills con clasificación Automatizable / Augmentado / Resiliente basada en taxonomía Frey-Osborne + tendencias 12 meses de vacantes reales.',
  },
  {
    icon: '🔭',
    title: 'Motor Predictivo 1–5 años',
    desc: 'Forecasting statsforecast (AutoETS) con bandas de confianza 80%/95%. Semáforo verde/ámbar/rojo para proyección a 1, 3 y 5 años.',
  },
  {
    icon: '🚨',
    title: 'Alertas automáticas',
    desc: 'Detección temprana de carreras con D1 crítico o D2 bajo. Notificaciones por email vía Resend con resumen ejecutivo.',
  },
  {
    icon: '📡',
    title: 'Radar de Eventos IA',
    desc: 'Monitoreo 24/7 de noticias de despidos y empleos IA (NewsAPI + Grok). Ingesta automática cada 12h con clasificación Groq.',
  },
  {
    icon: '📄',
    title: 'Reporte Rector PDF',
    desc: 'Generación automática de reportes ejecutivos de 3 páginas listos para consejo directivo, COEPES y acreditadoras. Sin esperar a la consultora.',
  },
]

const PRICING = [
  {
    tier: 'Starter',
    price: '$180,000',
    period: 'MXN/año',
    usd: '~$9,000 USD',
    desc: 'Para IES que quieren empezar a tomar decisiones con datos.',
    features: ['1 IES · 3 dimensiones', '5 usuarios', 'Reporte rector trimestral', 'Alertas por email', 'Soporte por chat'],
    cta: 'Solicitar demo',
    highlight: false,
  },
  {
    tier: 'Pro',
    price: '$420,000',
    period: 'MXN/año',
    usd: '~$21,000 USD',
    desc: 'Para planeación estratégica completa con todos los análisis.',
    features: ['1 IES · 7 dimensiones', '15 usuarios', 'Simulador de escenarios', 'API pública', 'Sesión ejecutiva mensual', 'Reporte mensual'],
    cta: 'Solicitar demo Pro',
    highlight: true,
  },
  {
    tier: 'Enterprise',
    price: 'Desde $850,000',
    period: 'MXN/año',
    usd: '~$42,000+ USD',
    desc: 'Multi-campus, integración SIIA y white-label.',
    features: ['Multi-campus', 'Integración SIIA', 'White-label', 'SLA 99.9%', 'Ejecutivo dedicado', 'Estudio de pertinencia ad-hoc'],
    cta: 'Solicitar estudio',
    highlight: false,
  },
]

const SOCIAL_PROOF = [
  { stat: '264+', label: 'Pruebas automatizadas' },
  { stat: '7', label: 'Dimensiones KPI' },
  { stat: '12h', label: 'Ciclo de actualización' },
  { stat: '5 años', label: 'Proyección predictiva' },
]

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-slate-100 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div>
          <span className="font-bold text-indigo-700 text-lg">OIA-EE</span>
          <span className="text-slate-400 text-sm ml-2">Observatorio IA · Empleo · Educación</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/ranking" className="text-sm text-slate-600 hover:text-indigo-700">Ver ranking</Link>
          <Link href="/pertinencia" className="text-sm text-slate-600 hover:text-indigo-700">Solicitar estudio</Link>
          <Link href="/login" className="text-sm text-slate-600 hover:text-indigo-700">Iniciar sesión</Link>
          <a
            href="mailto:sam.economia@gmail.com?subject=Solicitud%20Demo%20OIA-EE"
            className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Solicitar demo
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-b from-indigo-950 to-indigo-800 text-white px-6 py-24 text-center">
        <div className="max-w-3xl mx-auto">
          <span className="inline-block bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 text-xs font-medium px-3 py-1 rounded-full mb-6">
            Plataforma SaaS para IES mexicanas
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold mb-6 leading-tight">
            Sustituye la consultoría de pertinencia por{' '}
            <span className="text-indigo-300">inteligencia en tiempo real</span>
          </h1>
          <p className="text-lg text-indigo-200 mb-8 max-w-2xl mx-auto">
            Rankings de carreras por riesgo de automatización IA, alertas tempranas, motor predictivo y reportes ejecutivos — a una fracción del costo de Hanover Research o Lexia.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="mailto:sam.economia@gmail.com?subject=Solicitud%20Demo%20OIA-EE&body=Hola%2C%20quisiera%20agendar%20una%20demo%20de%20OIA-EE%20para%20nuestra%20institución."
              className="bg-white text-indigo-800 font-semibold px-6 py-3 rounded-lg hover:bg-indigo-50 transition-colors"
            >
              Agendar demo gratuita →
            </a>
            <Link href="/" className="border border-indigo-400 text-indigo-200 px-6 py-3 rounded-lg hover:bg-indigo-700/50 transition-colors">
              Ver plataforma
            </Link>
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="bg-indigo-900 py-8">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {SOCIAL_PROOF.map(s => (
            <div key={s.stat}>
              <p className="text-3xl font-bold text-white">{s.stat}</p>
              <p className="text-sm text-indigo-300 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-slate-900 mb-3">Todo lo que necesita Planeación Institucional</h2>
          <p className="text-slate-500 max-w-xl mx-auto">Datos de vacantes OCC, estadísticas IMSS/ENOE/ANUIES y noticias de IA — unificados en un solo dashboard actualizado cada 12 horas.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(f => (
            <div key={f.title} className="p-5 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <span className="text-2xl mb-3 block">{f.icon}</span>
              <h3 className="font-semibold text-slate-900 mb-2">{f.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* VS Consultoras */}
      <section className="bg-slate-50 py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-8">OIA-EE vs. Consultora tradicional</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-indigo-600 text-white">
                  <th className="p-3 text-left rounded-tl-lg">Criterio</th>
                  <th className="p-3 text-center">Hanover Research / Lexia</th>
                  <th className="p-3 text-center rounded-tr-lg font-bold">OIA-EE Pro</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Costo por IES', '$300k–$800k MXN/estudio', '$420k MXN/año (todo incluido)'],
                  ['Frecuencia de actualización', 'Anual (un reporte)', 'Cada 12 horas'],
                  ['Datos', 'Estáticos a fecha de corte', 'Tiempo real: OCC + IMSS + ENOE'],
                  ['Predicciones', 'No incluidas', '1, 3 y 5 años con IC'],
                  ['Alertas automáticas', 'No', 'Email + dashboard'],
                  ['API pública para integraciones', 'No', 'Incluida en Pro'],
                ].map(([criterio, antes, ahora], i) => (
                  <tr key={criterio} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="p-3 font-medium text-slate-700">{criterio}</td>
                    <td className="p-3 text-center text-slate-500">{antes}</td>
                    <td className="p-3 text-center text-indigo-700 font-semibold">{ahora}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-6 max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-3">Planes y precios</h2>
          <p className="text-slate-500">Sin contratos de largo plazo. Cancela cuando quieras.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {PRICING.map(p => (
            <div
              key={p.tier}
              className={`rounded-2xl p-6 flex flex-col ${p.highlight ? 'bg-indigo-600 text-white shadow-xl ring-2 ring-indigo-400' : 'bg-white border border-slate-200 shadow-sm'}`}
            >
              <div className="mb-4">
                <h3 className={`font-bold text-lg ${p.highlight ? 'text-white' : 'text-slate-900'}`}>{p.tier}</h3>
                <p className={`text-3xl font-bold mt-1 ${p.highlight ? 'text-white' : 'text-indigo-700'}`}>{p.price}</p>
                <p className={`text-sm ${p.highlight ? 'text-indigo-200' : 'text-slate-500'}`}>{p.period} · {p.usd}</p>
                <p className={`text-sm mt-2 ${p.highlight ? 'text-indigo-100' : 'text-slate-500'}`}>{p.desc}</p>
              </div>
              <ul className="space-y-2 flex-1 mb-6">
                {p.features.map(f => (
                  <li key={f} className={`flex items-center gap-2 text-sm ${p.highlight ? 'text-indigo-100' : 'text-slate-600'}`}>
                    <span className={p.highlight ? 'text-indigo-300' : 'text-emerald-500'}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              {p.tier === 'Enterprise' ? (
                <Link
                  href="/pertinencia"
                  className={`text-center py-2.5 px-4 rounded-lg font-semibold text-sm transition-colors bg-indigo-600 text-white hover:bg-indigo-700`}
                >
                  {p.cta}
                </Link>
              ) : (
                <a
                  href="mailto:sam.economia@gmail.com?subject=Solicitud%20Demo%20OIA-EE"
                  className={`text-center py-2.5 px-4 rounded-lg font-semibold text-sm transition-colors ${p.highlight ? 'bg-white text-indigo-700 hover:bg-indigo-50' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                >
                  {p.cta}
                </a>
              )}
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-slate-400 mt-6">
          Programa de Socios Fundadores disponible: 3 IES a 50% del Starter durante el primer año a cambio de logo y caso de éxito. <a href="mailto:sam.economia@gmail.com?subject=Socio%20Fundador%20OIA-EE" className="text-indigo-600 hover:underline">Contactar</a>
        </p>
      </section>

      {/* CTA Final */}
      <section className="bg-indigo-950 py-16 px-6 text-center text-white">
        <h2 className="text-2xl font-bold mb-3">Listo para tomar decisiones con datos reales</h2>
        <p className="text-indigo-300 mb-6 max-w-lg mx-auto">Agenda una demo en 30 minutos y ve tu IES en el dashboard con datos públicos.</p>
        <a
          href="mailto:sam.economia@gmail.com?subject=Solicitud%20Demo%20OIA-EE&body=Hola%2C%20quisiera%20agendar%20una%20demo%20de%2030%20minutos%20para%20ver%20nuestra%20institución%20en%20OIA-EE."
          className="bg-white text-indigo-800 font-semibold px-8 py-3 rounded-lg hover:bg-indigo-50 transition-colors inline-block"
        >
          Agendar demo gratuita →
        </a>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8 px-6 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} OIA-EE — Observatorio de Impacto IA en Educación y Empleo · México</p>
        <p className="mt-1">sam.economia@gmail.com · Todos los datos son públicos (IMSS, INEGI, ANUIES, SEP, OCC México)</p>
        <p className="mt-2">
          <Link href="/privacidad" className="hover:text-indigo-700">Aviso de privacidad</Link>
          {' · '}
          <Link href="/terminos" className="hover:text-indigo-700">Términos de servicio</Link>
        </p>
      </footer>
    </div>
  )
}

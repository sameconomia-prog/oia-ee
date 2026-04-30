import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Planes y Precios',
  description: 'Elige el plan OIA-EE que mejor se adapta a tu institución: desde observatorio básico hasta integración Enterprise con SIIA y white-label.',
}

const FEATURES_STARTER = [
  '1 IES, hasta 3 dimensiones KPI',
  'Dashboard rector con PDF trimestral',
  'Alertas automáticas D1/D2',
  'Hasta 5 usuarios',
  'Soporte por email (48 h)',
]
const FEATURES_PRO = [
  'Todo Starter, más:',
  '7 dimensiones D1–D7 completas',
  'Simulador de escenarios',
  'Predicciones con FanChart',
  'Exportación CSV / API',
  'Hasta 15 usuarios',
  'Sesión ejecutiva mensual',
  'SLA 99.5 % / respuesta 24 h',
]
const FEATURES_ENT = [
  'Todo Pro, más:',
  'Multi-campus ilimitado',
  'Integración SIIA Enterprise (webhook)',
  'White-label — dominio y branding propios',
  'Usuarios ilimitados',
  'SLA 99.9 % / respuesta 4 h',
  'Onboarding y capacitación in-situ',
  'Cuenta dedicada de éxito',
]
const FEATURES_ADDON = [
  'Estudio de pertinencia ad-hoc',
  'Reporte PDF de 11 páginas',
  'Comparativo vs media nacional',
  'Plan curricular de mejora',
  'Entregable en 15 días hábiles',
]

interface PlanCardProps {
  name: string
  price: string
  priceUsd?: string
  period?: string
  desc: string
  features: string[]
  highlight?: boolean
  tag?: string
  cta?: string
  ctaHref?: string
  ctaSecondary?: string
}

function Check() {
  return (
    <svg className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

function PlanCard({ name, price, priceUsd, period = '/año', desc, features, highlight = false, tag, cta = 'Solicitar demo', ctaHref = '/pertinencia', ctaSecondary }: PlanCardProps) {
  return (
    <div className={`relative flex flex-col rounded-2xl border p-6 ${highlight ? 'border-indigo-400 shadow-lg shadow-indigo-100 bg-white' : 'border-slate-200 bg-white'}`}>
      {tag && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wide">
          {tag}
        </span>
      )}
      <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${highlight ? 'text-indigo-600' : 'text-slate-500'}`}>{name}</p>
      <div className="mb-1">
        <span className="text-3xl font-bold text-slate-900">{price}</span>
        <span className="text-sm text-slate-500 ml-1">{period}</span>
      </div>
      {priceUsd && <p className="text-xs text-slate-400 mb-3">≈ {priceUsd} USD/año</p>}
      <p className="text-xs text-slate-500 mb-5 leading-relaxed">{desc}</p>
      <ul className="space-y-2 flex-1 mb-6">
        {features.map(f => (
          <li key={f} className="flex items-start gap-2 text-xs text-slate-700">
            <Check />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Link
        href={ctaHref}
        className={`w-full text-center py-2.5 rounded-xl text-sm font-semibold transition-colors ${highlight ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'border border-slate-300 text-slate-700 hover:bg-slate-50'}`}
      >
        {cta}
      </Link>
      {ctaSecondary && (
        <p className="text-center text-[11px] text-slate-400 mt-2">{ctaSecondary}</p>
      )}
    </div>
  )
}

export default function PlanesPage() {
  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center mb-12">
        <span className="inline-block px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold mb-3">
          Programa Socios Fundadores · 50% descuento primeras 3 IES
        </span>
        <h1 className="text-3xl font-bold text-slate-900 mb-3">
          Inteligencia institucional para decisiones académicas
        </h1>
        <p className="text-slate-500 text-base max-w-xl mx-auto">
          Sustituye estudios de pertinencia de $300k–$800k MXN con un observatorio vivo, actualizable y defendible ante consejo directivo.
        </p>
      </div>

      {/* Planes principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <PlanCard
          name="Starter · Observatorio"
          price="$180,000"
          priceUsd="~$9,000"
          desc="Observatorio básico para IES que quiere conocer su posición de riesgo y oportunidad frente a la IA."
          features={FEATURES_STARTER}
          cta="Solicitar demo"
          ctaHref="/pertinencia"
          ctaSecondary="Sin costo de implementación"
        />
        <PlanCard
          name="Pro · Estratégico"
          price="$420,000"
          priceUsd="~$21,000"
          desc="Análisis completo con simulador, predicciones y API. Para instituciones con cultura de datos avanzada."
          features={FEATURES_PRO}
          highlight
          tag="Más popular"
          cta="Solicitar demo"
          ctaHref="/pertinencia"
          ctaSecondary="Incluye 1 sesión ejecutiva de arranque"
        />
        <PlanCard
          name="Enterprise · Sistema"
          price="$850k–$1.2M"
          priceUsd="~$42k–$60k"
          desc="Para sistemas multi-campus que requieren integración SIIA, branding propio y SLA garantizado."
          features={FEATURES_ENT}
          cta="Hablar con ventas"
          ctaHref="/pertinencia"
        />
      </div>

      {/* Add-on */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-10">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex-1">
            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Add-on puntual</span>
            <h2 className="text-xl font-bold text-slate-900 mt-0.5 mb-1">Estudio de Pertinencia Ad-hoc</h2>
            <p className="text-sm text-slate-600">
              Reporte ejecutivo PDF de 11 páginas sobre una carrera específica: riesgo D1–D7, comparativo nacional,
              proyecciones y plan de mejora curricular. Puerta de entrada ideal antes de suscribir un plan anual.
            </p>
          </div>
          <div className="text-center shrink-0">
            <p className="text-3xl font-bold text-slate-900">$120,000</p>
            <p className="text-xs text-slate-500">MXN · ≈ $6,000 USD</p>
            <p className="text-xs text-slate-400 mb-3">Entrega en 15 días hábiles</p>
            <ul className="text-xs text-slate-600 space-y-1 text-left mb-4">
              {FEATURES_ADDON.map(f => (
                <li key={f} className="flex items-center gap-1.5"><Check />{f}</li>
              ))}
            </ul>
            <Link
              href="/pertinencia"
              className="inline-block bg-amber-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-amber-600 transition-colors"
            >
              Solicitar estudio →
            </Link>
          </div>
        </div>
      </div>

      {/* Tabla comparativa */}
      <div className="mb-10">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Comparativa completa</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Funcionalidad</th>
                <th className="px-4 py-3 text-center">Starter</th>
                <th className="px-4 py-3 text-center bg-indigo-50">Pro</th>
                <th className="px-4 py-3 text-center">Enterprise</th>
              </tr>
            </thead>
            <tbody className="text-xs">
              {[
                ['KPIs D1–D3, D6', '✓', '✓', '✓'],
                ['KPIs D4, D5, D7', '—', '✓', '✓'],
                ['Reporte rector PDF', '✓', '✓', '✓'],
                ['Alertas automáticas', '✓', '✓', '✓'],
                ['Benchmark nacional', '—', '✓', '✓'],
                ['Simulador de escenarios', '—', '✓', '✓'],
                ['Predicciones FanChart', '—', '✓', '✓'],
                ['Exportación CSV / API', '—', '✓', '✓'],
                ['Integración SIIA', '—', '—', '✓'],
                ['White-label / dominio propio', '—', '—', '✓'],
                ['Usuarios', '5', '15', 'Ilimitado'],
                ['SLA disponibilidad', '99 %', '99.5 %', '99.9 %'],
                ['Tiempo de respuesta soporte', '48 h', '24 h', '4 h'],
              ].map(([feat, s, p, e]) => (
                <tr key={feat} className="border-t border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-slate-700">{feat}</td>
                  <td className="px-4 py-2.5 text-center text-slate-400">{s}</td>
                  <td className="px-4 py-2.5 text-center bg-indigo-50/50 font-medium text-indigo-700">{p}</td>
                  <td className="px-4 py-2.5 text-center text-slate-400">{e}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CTA final */}
      <div className="text-center bg-indigo-600 rounded-2xl p-8 text-white">
        <h2 className="text-xl font-bold mb-2">¿Listo para tu demo viva?</h2>
        <p className="text-indigo-200 text-sm mb-6">
          Generamos un reporte real con datos de tu institución en menos de 24 horas.
          Sin compromiso, sin contratos de entrada.
        </p>
        <Link
          href="/pertinencia"
          className="inline-block bg-white text-indigo-700 font-semibold px-6 py-3 rounded-xl hover:bg-indigo-50 transition-colors"
        >
          Solicitar estudio de pertinencia gratuito →
        </Link>
        <p className="text-indigo-300 text-xs mt-3">
          O escríbenos a <span className="underline">hola@oia-ee.mx</span>
        </p>
      </div>
    </div>
  )
}

// frontend/src/components/landing/RectorCTA.tsx
import Link from 'next/link'

interface RectorCTAProps {
  dobleAlertaCount: number
}

export default function RectorCTA({ dobleAlertaCount }: RectorCTAProps) {
  return (
    <section className="max-w-5xl mx-auto px-4 py-10">
      <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 p-8 flex flex-col md:flex-row items-center gap-6">
        <div className="flex-1">
          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-2">Para rectores y directivos académicos</p>
          <h2 className="text-xl font-bold text-indigo-900 mb-2">
            ¿Cuánto riesgo tiene el portafolio de carreras de tu IES?
          </h2>
          <p className="text-sm text-indigo-700 leading-relaxed">
            {dobleAlertaCount > 0
              ? `Hay ${dobleAlertaCount} carrera${dobleAlertaCount !== 1 ? 's' : ''} con doble alerta en México hoy. Solicita un análisis de pertinencia curricular gratuito para saber cómo está tu institución.`
              : 'Solicita un análisis de pertinencia curricular gratuito: diagnóstico D1–D6, matriz de skills y recomendaciones accionables para presentar a tu consejo académico.'}
          </p>
        </div>
        <div className="flex flex-col gap-3 shrink-0">
          <Link
            href="/pertinencia"
            className="inline-flex items-center justify-center px-6 py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors whitespace-nowrap"
          >
            Solicitar análisis gratuito →
          </Link>
          <Link
            href="/ies"
            className="inline-flex items-center justify-center px-6 py-2.5 border border-indigo-300 text-indigo-700 text-sm font-semibold rounded-xl hover:bg-indigo-100 transition-colors whitespace-nowrap"
          >
            Ver datos de mi IES
          </Link>
        </div>
      </div>
    </section>
  )
}

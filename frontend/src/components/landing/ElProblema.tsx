import Link from 'next/link'

export default function ElProblema() {
  return (
    <section className="py-20 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">
          El problema que nadie está midiendo en tiempo real
        </h2>
        <p className="text-center text-gray-500 mb-12 max-w-2xl mx-auto">
          Los datos de OIA-EE revelan una brecha estructural entre lo que las IES enseñan
          y lo que el mercado laboral demanda — y está creciendo.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          <div className="bg-[#F8FAFC] rounded-xl p-8 border border-gray-100">
            <span className="inline-block bg-blue-100 text-[#1D4ED8] text-xs font-semibold px-3 py-1 rounded-full mb-4">
              Para IES y Rectores
            </span>
            <p className="text-gray-800 text-lg leading-relaxed mb-6">
              El <strong>38% de las licenciaturas</strong> en México registra un Índice de
              Vulnerabilidad ante la Automatización (IVA) superior a 0.5 — la mitad de sus
              egresados compite con ocupaciones en riesgo de automatización parcial o total.
            </p>
            <Link href="/plataforma/carreras" className="text-[#1D4ED8] font-medium text-sm hover:underline">
              Ver ranking de carreras →
            </Link>
          </div>
          <div className="bg-[#F8FAFC] rounded-xl p-8 border border-gray-100">
            <span className="inline-block bg-blue-100 text-[#1D4ED8] text-xs font-semibold px-3 py-1 rounded-full mb-4">
              Para Gobierno y Política Pública
            </span>
            <p className="text-gray-800 text-lg leading-relaxed mb-6">
              La transición no es uniforme. Mientras estados como NL y CDMX concentran la
              demanda de skills emergentes, entidades con menor densidad industrial enfrentan
              desplazamiento sin oferta educativa alternativa.
            </p>
            <Link href="/plataforma/estadisticas" className="text-[#1D4ED8] font-medium text-sm hover:underline">
              Ver distribución por estado →
            </Link>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-gray-800 leading-relaxed">
            El WEF proyecta que el <strong>44% de las competencias clave</strong> actuales quedará
            obsoleto para 2027. Los ciclos de actualización curricular en México promedian{' '}
            <strong>4.2 años</strong>. La brecha ya empezó a abrirse.
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Fuentes: WEF Future of Jobs 2025 · datos OIA-EE Q1 2026
          </p>
        </div>
      </div>
    </section>
  )
}

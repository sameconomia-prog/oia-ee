import Link from 'next/link'

export default function MetodologiaPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Metodología</h1>
      <p className="text-gray-500 text-sm mb-8">
        El Observatorio OIA-EE calcula 7 dimensiones de impacto de la IA en educación y empleo en México.
        Cada dimensión combina indicadores normalizados en un score 0–1.
      </p>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-gray-800 mb-3 pb-1 border-b">Dimensiones por Carrera</h2>
        <div className="space-y-4">
          <DimCard
            id="D1"
            nombre="Obsolescencia Curricular"
            color="text-red-700 bg-red-50"
            desc="Mide el riesgo de que las competencias enseñadas sean automatizadas. Score alto = mayor riesgo."
            componentes={[
              { clave: 'IVA', nombre: 'Índice de Vulnerabilidad a Automatización', dir: '↑ riesgo' },
              { clave: 'BES', nombre: 'Brecha Educación–Sector', dir: '↑ riesgo' },
              { clave: 'VAC', nombre: 'Velocidad de Automatización de Competencias', dir: '↑ riesgo' },
            ]}
            interpretacion="D1 ≥ 0.6 → riesgo alto · 0.4–0.6 → riesgo medio · < 0.4 → riesgo bajo"
          />
          <DimCard
            id="D2"
            nombre="Oportunidades de Actualización"
            color="text-blue-700 bg-blue-50"
            desc="Mide la capacidad de la carrera para aprovechar la IA como oportunidad. Score alto = mayor potencial."
            componentes={[
              { clave: 'IOE', nombre: 'Índice de Oportunidades de Empleo Emergente', dir: '↑ mejor' },
              { clave: 'IHE', nombre: 'Índice de Habilitación Emergente', dir: '↑ mejor' },
              { clave: 'IEA', nombre: 'Índice de Empleabilidad Ajustada', dir: '↑ mejor' },
            ]}
            interpretacion="D2 ≥ 0.6 → alto potencial · 0.4–0.6 → potencial medio · < 0.4 → bajo potencial"
          />
          <DimCard
            id="D3"
            nombre="Relevancia en Mercado Laboral"
            color="text-purple-700 bg-purple-50"
            desc="Mide qué tan alineada está la carrera con las demandas actuales del mercado laboral."
            componentes={[
              { clave: 'TDM', nombre: 'Tasa de Demanda en el Mercado', dir: '↑ mejor' },
              { clave: 'TVC', nombre: 'Tendencia de Vacantes con IA', dir: '↑ mejor' },
              { clave: 'BRS', nombre: 'Brecha Reskilling', dir: '↑ mejor' },
              { clave: 'ICE', nombre: 'Índice de Competencias Emergentes', dir: '↑ mejor' },
            ]}
            interpretacion="D3 ≥ 0.6 → alta relevancia · 0.4–0.6 → relevancia media · < 0.4 → baja relevancia"
          />
          <DimCard
            id="D6"
            nombre="Perfil Estudiantil"
            color="text-teal-700 bg-teal-50"
            desc="Evalúa el perfil e inversión de los estudiantes en relación con las perspectivas laborales."
            componentes={[
              { clave: 'IEI', nombre: 'Índice de Eficiencia de Inversión', dir: '↑ mejor' },
              { clave: 'CRC', nombre: 'Coeficiente de Retorno de Competencias', dir: '↑ mejor' },
              { clave: 'ROI-E', nombre: 'Retorno sobre Inversión Educativa', dir: '↑ mejor' },
            ]}
            interpretacion="D6 ≥ 0.6 → perfil óptimo · 0.4–0.6 → perfil regular · < 0.4 → perfil débil"
          />
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-gray-800 mb-3 pb-1 border-b">Dimensiones Institucionales y Contextuales</h2>
        <div className="space-y-4">
          <DimCard
            id="D4"
            nombre="Salud Institucional"
            color="text-orange-700 bg-orange-50"
            desc="Evalúa la solidez institucional de una IES en cuatro indicadores clave."
            componentes={[
              { clave: 'TRA', nombre: 'Tasa de Retención-Absorción', dir: '↑ mejor' },
              { clave: 'IRF', nombre: 'Índice de Riesgo Financiero', dir: '↓ mejor (menor=mejor)' },
              { clave: 'CAD', nombre: 'Cobertura de Actualización Digital', dir: '↑ mejor' },
            ]}
            interpretacion="D4 ≥ 0.6 → institución sólida · 0.4–0.6 → institución regular · < 0.4 → institución en riesgo"
          />
          <DimCard
            id="D5"
            nombre="Geografía e Infraestructura"
            color="text-green-700 bg-green-50"
            desc="Mide la cobertura de educación superior y conectividad digital a nivel estatal."
            componentes={[
              { clave: 'IDR', nombre: 'Índice de Densidad de Riesgo', dir: '↓ mejor (menor=mejor)' },
              { clave: 'ICG', nombre: 'Índice de Conectividad y Geografía', dir: '↑ mejor' },
              { clave: 'IES-S', nombre: 'Índice de IES por Sector', dir: '↑ mejor' },
            ]}
            interpretacion="D5 ≥ 0.6 → entorno favorable · 0.4–0.6 → entorno regular · < 0.4 → entorno desfavorable"
          />
          <DimCard
            id="D7"
            nombre="Pulso de Noticias IA"
            color="text-indigo-700 bg-indigo-50"
            desc="Analiza el sentimiento y tendencias de noticias sobre IA en el contexto de educación y empleo."
            componentes={[
              { clave: 'ISN', nombre: 'Índice de Sentimiento de Noticias', dir: '↑ mejor' },
              { clave: 'VDM', nombre: 'Velocidad de Difusión Mediática', dir: '↑ mejor' },
            ]}
            interpretacion="D7 ≥ 0.6 → entorno mediático positivo · 0.4–0.6 → neutral · < 0.4 → entorno negativo"
          />
        </div>
      </section>

      <section className="bg-gray-50 rounded-xl border p-5 mb-8">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Escala de interpretación general</h2>
        <div className="grid grid-cols-3 gap-3 text-center text-xs">
          <div className="bg-green-50 border border-green-200 rounded p-3">
            <p className="font-semibold text-green-700 text-base mb-1">≥ 0.6</p>
            <p className="text-green-600">Score favorable</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
            <p className="font-semibold text-yellow-700 text-base mb-1">0.4 – 0.6</p>
            <p className="text-yellow-600">Score moderado</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded p-3">
            <p className="font-semibold text-red-700 text-base mb-1">{'< 0.4'}</p>
            <p className="text-red-600">Score desfavorable</p>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Excepción: D1 Obsolescencia — la escala está invertida; score alto = mayor riesgo.
        </p>
      </section>

      <div className="mt-8 rounded-xl bg-indigo-50 border border-indigo-200 p-6">
        <h3 className="text-base font-bold text-indigo-900 mb-2">¿Cómo se ven estos datos para tu carrera?</h3>
        <p className="text-sm text-indigo-700 mb-4">
          Explora los benchmarks internacionales de habilidades por carrera o solicita el análisis personalizado de pertinencia curricular de tu institución.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/benchmarks"
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Ver benchmarks globales →
          </Link>
          <Link
            href="/pertinencia"
            className="inline-flex items-center px-4 py-2 border border-indigo-300 text-indigo-700 text-sm font-semibold rounded-lg hover:bg-indigo-100 transition-colors"
          >
            Solicitar análisis gratuito
          </Link>
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center mt-6">
        OIA-EE · Observatorio de Impacto IA en Educación y Empleo · México 2026
      </p>
    </div>
  )
}

function DimCard({ id, nombre, color, desc, componentes, interpretacion }: {
  id: string
  nombre: string
  color: string
  desc: string
  componentes: { clave: string; nombre: string; dir: string }[]
  interpretacion: string
}) {
  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-gray-50">
        <span className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${color}`}>{id}</span>
        <h3 className="font-semibold text-gray-800 text-sm">{nombre}</h3>
      </div>
      <div className="px-4 py-3">
        <p className="text-xs text-gray-600 mb-3">{desc}</p>
        <div className="space-y-1 mb-3">
          {componentes.map(c => (
            <div key={c.clave} className="flex items-center gap-2 text-xs">
              <span className="font-mono font-semibold text-gray-700 w-14 shrink-0">{c.clave}</span>
              <span className="text-gray-500">{c.nombre}</span>
              <span className="text-gray-400 ml-auto shrink-0">{c.dir}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 italic border-t pt-2">{interpretacion}</p>
      </div>
    </div>
  )
}

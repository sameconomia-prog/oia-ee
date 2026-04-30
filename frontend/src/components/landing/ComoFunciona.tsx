import Link from 'next/link'

const pasos = [
  {
    numero: '01',
    titulo: 'Monitoreamos',
    descripcion: 'RSS, GDELT, OCC Mundial, ANUIES y STPS: datos en tiempo real sobre empleo, educación e impacto de la IA en México y LatAm.',
    icono: '📡',
  },
  {
    numero: '02',
    titulo: 'Calculamos',
    descripcion: '31 KPIs en 7 dimensiones. Desde el riesgo de automatización de una carrera hasta el ROI educativo estimado para el estudiante.',
    icono: '⚙️',
  },
  {
    numero: '03',
    titulo: 'Interpretamos',
    descripcion: 'Alertas tempranas, escenarios predictivos y reportes ejecutivos para que rectores y policy makers tomen decisiones con datos.',
    icono: '📊',
  },
]

export default function ComoFunciona() {
  return (
    <section id="como-funciona" className="py-20 px-4 bg-[#F8FAFC]">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">
          Cómo funciona OIA-EE
        </h2>
        <p className="text-center text-gray-500 mb-16 max-w-xl mx-auto">
          Un pipeline de datos automatizado que transforma fuentes dispersas en inteligencia accionable.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {pasos.map((paso) => (
            <div key={paso.numero} className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
              <div className="text-3xl mb-4">{paso.icono}</div>
              <p className="text-[#1D4ED8] font-bold text-sm mb-1">{paso.numero}</p>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{paso.titulo}</h3>
              <p className="text-gray-600 leading-relaxed">{paso.descripcion}</p>
            </div>
          ))}
        </div>
        <div className="text-center">
          <Link href="/plataforma" className="inline-flex items-center gap-2 text-[#1D4ED8] font-semibold hover:underline">
            → Explorar la plataforma
          </Link>
        </div>
      </div>
    </section>
  )
}

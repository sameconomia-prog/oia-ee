// frontend/src/components/landing/BenchmarksSection.tsx
import Link from 'next/link'

const CAREERS = [
  'Derecho', 'Medicina', 'Arquitectura', 'Enfermería', 'Mercadotecnia',
  'Psicología', 'Administración', 'Contaduría', 'Diseño Gráfico',
  'Ing. Sistemas', 'Comunicación', 'Economía', 'Educación',
  'Turismo', 'Ciencias Políticas', 'Nutrición', 'Ing. Civil',
]

const SOURCES = [
  { name: 'WEF 2025', color: 'bg-blue-100 text-blue-800' },
  { name: 'McKinsey 2023', color: 'bg-purple-100 text-purple-800' },
  { name: 'Frey-Osborne 2013', color: 'bg-amber-100 text-amber-800' },
  { name: 'CEPAL 2023', color: 'bg-green-100 text-green-800' },
  { name: 'Anthropic 2025', color: 'bg-slate-100 text-slate-800' },
]

export default function BenchmarksSection() {
  return (
    <section className="py-20 bg-slate-900 text-white">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-12">
          <span className="inline-block text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-3">
            Benchmarks Globales
          </span>
          <h2 className="text-3xl font-bold text-white mb-4">
            17 carreras analizadas con datos internacionales
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-base leading-relaxed">
            Cruzamos 5 fuentes de investigación internacional para determinar si las habilidades
            que se enseñan en México están creciendo o declinando ante la IA.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 mb-10 text-center">
          {[
            { n: '17', label: 'Carreras analizadas' },
            { n: '5', label: 'Fuentes internacionales' },
            { n: '88', label: 'Skills evaluadas' },
          ].map(s => (
            <div key={s.n} className="bg-slate-800/60 rounded-xl p-5 border border-slate-700/50">
              <p className="text-4xl font-bold font-mono text-indigo-400">{s.n}</p>
              <p className="text-sm text-slate-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Sources */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {SOURCES.map(s => (
            <span key={s.name} className={`text-xs font-semibold px-3 py-1.5 rounded-full ${s.color}`}>
              {s.name}
            </span>
          ))}
        </div>

        {/* Career pills */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {CAREERS.map(c => (
            <span key={c} className="text-xs text-slate-400 bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700/50">
              {c}
            </span>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/benchmarks"
            className="inline-flex items-center justify-center px-6 py-3 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Ver matriz de convergencia →
          </Link>
          <Link
            href="/pertinencia"
            className="inline-flex items-center justify-center px-6 py-3 border border-slate-600 text-slate-300 text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors"
          >
            Solicitar análisis de mi carrera
          </Link>
        </div>
      </div>
    </section>
  )
}

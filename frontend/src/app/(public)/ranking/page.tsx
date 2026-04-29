import type { Metadata } from 'next'
import Link from 'next/link'

export const revalidate = 3600 // ISR: revalida cada hora

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

interface CarreraRanking {
  carrera_id: string
  nombre: string
  d1_score: number
  d2_score: number
  matricula: number | null
  area_conocimiento: string | null
}

async function fetchRanking(orden: 'd1' | 'd2', n = 60): Promise<CarreraRanking[]> {
  try {
    const res = await fetch(`${API}/publico/kpis/ranking?n=${n}&orden=${orden}`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}

async function fetchAreas(): Promise<string[]> {
  try {
    const res = await fetch(`${API}/publico/carreras/areas`, { next: { revalidate: 3600 } })
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

export const metadata: Metadata = {
  title: 'Ranking de Carreras por Riesgo de Automatización IA — México 2025',
  description:
    'Clasificación de licenciaturas mexicanas según su exposición a la automatización por inteligencia artificial. D1 Obsolescencia y D2 Oportunidades calculados con datos de vacantes OCC, IMSS y ENOE.',
  keywords: [
    'riesgo automatización carreras México',
    'impacto IA educación',
    'carreras en peligro inteligencia artificial',
    'ranking empleabilidad licenciaturas',
    'OIA-EE observatorio',
  ],
  openGraph: {
    title: 'Ranking Carreras — Impacto IA en Educación y Empleo',
    description: 'Qué carreras tienen mayor riesgo de automatización IA en México. Datos abiertos.',
    type: 'website',
    locale: 'es_MX',
  },
  alternates: { canonical: 'https://oia-ee.vercel.app/ranking' },
}

function RiesgoBar({ score, invert = false }: { score: number; invert?: boolean }) {
  const bad = invert ? score >= 0.7 : score < 0.4
  const ok  = invert ? score < 0.4  : score >= 0.7
  const color = ok ? '#10b981' : bad ? '#ef4444' : '#f59e0b'
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${score * 100}%`, background: color }} />
      </div>
      <span className="text-xs font-mono" style={{ color }}>{score.toFixed(2)}</span>
    </div>
  )
}

function RiesgoChip({ score }: { score: number }) {
  const label = score >= 0.7 ? 'Alto' : score >= 0.4 ? 'Medio' : 'Bajo'
  const style: React.CSSProperties = score >= 0.7
    ? { background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' }
    : score >= 0.4
    ? { background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' }
    : { background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' }
  return <span style={{ ...style, fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4 }}>{label}</span>
}

export default async function RankingPage() {
  const [riesgo, oportunidades, areas] = await Promise.all([
    fetchRanking('d1', 60),
    fetchRanking('d2', 60),
    fetchAreas(),
  ])

  const totalCarreras = riesgo.length
  const altoRiesgo = riesgo.filter(c => c.d1_score >= 0.7).length
  const altaOp = oportunidades.filter(c => c.d2_score >= 0.6).length

  // JSON-LD structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'Ranking de Carreras por Impacto de IA — OIA-EE',
    description: 'Clasificación de licenciaturas mexicanas por riesgo de automatización D1 y oportunidad de empleo D2.',
    creator: { '@type': 'Organization', name: 'OIA-EE' },
    dateModified: new Date().toISOString().slice(0, 10),
    license: 'https://creativecommons.org/licenses/by/4.0/',
    spatialCoverage: 'México',
    temporalCoverage: new Date().getFullYear().toString(),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="min-h-screen bg-white">
        {/* Nav mínima */}
        <nav className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <Link href="/demo" className="font-bold text-indigo-700 text-lg">OIA-EE</Link>
          <div className="flex gap-4 text-sm">
            <Link href="/ranking" className="font-medium text-indigo-700">Ranking</Link>
            <Link href="/demo" className="text-slate-600 hover:text-indigo-700">Demo</Link>
            <Link href="/login" className="text-slate-600 hover:text-indigo-700">Acceso</Link>
          </div>
        </nav>

        <main className="max-w-5xl mx-auto px-6 py-12">
          {/* Hero */}
          <div className="mb-10">
            <h1 className="text-3xl font-bold text-slate-900 mb-3">
              Ranking de Carreras por Riesgo de Automatización IA
            </h1>
            <p className="text-slate-500 max-w-2xl">
              Clasificación de licenciaturas en México según su exposición a la inteligencia artificial.
              D1 mide el riesgo de obsolescencia; D2 mide la demanda y oportunidad laboral.
              Datos actualizados con vacantes OCC México, estadísticas IMSS/ENOE e ANUIES.
            </p>

            {/* Stats */}
            <div className="flex flex-wrap gap-6 mt-6">
              {[
                { label: 'Carreras analizadas', val: totalCarreras },
                { label: 'Con alto riesgo D1', val: altoRiesgo, red: true },
                { label: 'Con alta oportunidad D2', val: altaOp, green: true },
                { label: 'Áreas de conocimiento', val: areas.length },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <p className={`text-2xl font-bold ${s.red ? 'text-red-600' : s.green ? 'text-emerald-600' : 'text-indigo-700'}`}>{s.val}</p>
                  <p className="text-xs text-slate-500">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Metodología rápida */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-8 text-sm text-indigo-800">
            <strong>Metodología:</strong> D1 (Obsolescencia) ↑ = mayor riesgo de automatización. D2 (Oportunidades) ↑ = mayor demanda laboral.
            Escala 0–1. Umbrales: ≥0.70 = Alto · 0.40–0.70 = Medio · &lt;0.40 = Bajo. Fuentes: OCC México, IMSS, INEGI ENOE, ANUIES.
            {' '}<Link href="/demo#metodologia" className="underline">Ver metodología completa →</Link>
          </div>

          {/* Tabla D1 — Mayor riesgo */}
          <section className="mb-12">
            <h2 className="text-xl font-bold text-slate-900 mb-1">
              Carreras con Mayor Riesgo de Automatización
            </h2>
            <p className="text-sm text-slate-500 mb-4">Ordenadas por D1 Obsolescencia descendente (mayor riesgo primero)</p>
            <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="px-4 py-3 text-left w-8">#</th>
                    <th className="px-4 py-3 text-left">Carrera</th>
                    <th className="px-4 py-3 text-left hidden sm:table-cell">Área</th>
                    <th className="px-4 py-3 text-center">D1 Riesgo</th>
                    <th className="px-4 py-3 text-center">D2 Oportunidad</th>
                    <th className="px-4 py-3 text-center hidden md:table-cell">Matrícula</th>
                  </tr>
                </thead>
                <tbody>
                  {riesgo.map((c, i) => (
                    <tr key={c.carrera_id} className={`border-t border-slate-100 hover:bg-slate-50 ${i < 5 ? 'bg-red-50/40' : ''}`}>
                      <td className="px-4 py-2.5 text-slate-400 font-mono text-xs">{i + 1}</td>
                      <td className="px-4 py-2.5">
                        <Link href={`/carreras/${c.carrera_id}`} className="font-medium text-slate-800 hover:text-indigo-700 hover:underline">
                          {c.nombre}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 hidden sm:table-cell">
                        {c.area_conocimiento && (
                          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{c.area_conocimiento}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <RiesgoChip score={c.d1_score} />
                          <RiesgoBar score={c.d1_score} invert />
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <RiesgoBar score={c.d2_score} />
                      </td>
                      <td className="px-4 py-2.5 text-center hidden md:table-cell text-slate-500 text-xs font-mono">
                        {c.matricula != null ? c.matricula.toLocaleString('es-MX') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Tabla D2 — Mayor oportunidad */}
          <section className="mb-12">
            <h2 className="text-xl font-bold text-slate-900 mb-1">
              Carreras con Mayor Oportunidad Laboral
            </h2>
            <p className="text-sm text-slate-500 mb-4">Ordenadas por D2 Oportunidades descendente (mayor demanda primero)</p>
            <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-emerald-900 text-white">
                    <th className="px-4 py-3 text-left w-8">#</th>
                    <th className="px-4 py-3 text-left">Carrera</th>
                    <th className="px-4 py-3 text-left hidden sm:table-cell">Área</th>
                    <th className="px-4 py-3 text-center">D2 Oportunidad</th>
                    <th className="px-4 py-3 text-center">D1 Riesgo</th>
                    <th className="px-4 py-3 text-center hidden md:table-cell">Matrícula</th>
                  </tr>
                </thead>
                <tbody>
                  {oportunidades.map((c, i) => (
                    <tr key={c.carrera_id} className={`border-t border-slate-100 hover:bg-slate-50 ${i < 5 ? 'bg-emerald-50/40' : ''}`}>
                      <td className="px-4 py-2.5 text-slate-400 font-mono text-xs">{i + 1}</td>
                      <td className="px-4 py-2.5">
                        <Link href={`/carreras/${c.carrera_id}`} className="font-medium text-slate-800 hover:text-emerald-700 hover:underline">
                          {c.nombre}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 hidden sm:table-cell">
                        {c.area_conocimiento && (
                          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{c.area_conocimiento}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <RiesgoBar score={c.d2_score} />
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <RiesgoChip score={c.d1_score} />
                          <RiesgoBar score={c.d1_score} invert />
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-center hidden md:table-cell text-slate-500 text-xs font-mono">
                        {c.matricula != null ? c.matricula.toLocaleString('es-MX') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* CTA */}
          <div className="bg-indigo-950 text-white rounded-2xl p-8 text-center">
            <h2 className="text-xl font-bold mb-2">¿Tu institución aparece en este ranking?</h2>
            <p className="text-indigo-300 text-sm mb-5">
              Obtén el análisis completo con D1–D7, alertas automáticas, motor predictivo y reporte ejecutivo para tu consejo directivo.
            </p>
            <a
              href="mailto:sam.economia@gmail.com?subject=Demo%20OIA-EE%20Ranking"
              className="inline-block bg-white text-indigo-800 font-semibold px-6 py-2.5 rounded-lg hover:bg-indigo-50 transition-colors text-sm"
            >
              Solicitar demo gratuita →
            </a>
          </div>
        </main>

        <footer className="border-t border-slate-100 py-6 px-6 text-center text-xs text-slate-400 mt-8">
          <p>© {new Date().getFullYear()} OIA-EE · Datos: IMSS, INEGI ENOE, OCC México, ANUIES · Licencia CC BY 4.0</p>
          <p className="mt-1">
            <Link href="/demo" className="hover:text-indigo-700">Producto</Link>
            {' · '}
            <Link href="/login" className="hover:text-indigo-700">Acceso institucional</Link>
          </p>
        </footer>
      </div>
    </>
  )
}

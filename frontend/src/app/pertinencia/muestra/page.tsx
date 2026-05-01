// frontend/src/app/pertinencia/muestra/page.tsx
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Muestra de reporte — Estudio de Pertinencia Curricular | OIA-EE',
  description: 'Ejemplo de un Estudio de Pertinencia Curricular elaborado por OIA-EE. Diagnóstico D1–D6, skills en declive y oportunidades, recomendaciones accionables.',
}

const DECLINING = [
  { skill: 'Elaboración manual de estados financieros', consenso: 88, horizonte: '≤2 años', accion: 'Retirar' },
  { skill: 'Gestión de inventarios con sistemas heredados', consenso: 82, horizonte: '≤2 años', accion: 'Retirar' },
  { skill: 'Análisis de datos con hojas de cálculo', consenso: 74, horizonte: '3–5 años', accion: 'Rediseñar' },
  { skill: 'Auditoría de procesos presencial', consenso: 71, horizonte: '3–5 años', accion: 'Rediseñar' },
  { skill: 'Marketing tradicional (impresos, BTL)', consenso: 68, horizonte: '3–5 años', accion: 'Rediseñar' },
  { skill: 'Contratación y nómina manual', consenso: 62, horizonte: '5+ años', accion: 'Rediseñar' },
]

const GROWING = [
  { skill: 'Análisis de datos con IA y Python/R', consenso: 91, horizonte: '5+ años', accion: 'Agregar' },
  { skill: 'Estrategia de negocios digitales', consenso: 85, horizonte: '5+ años', accion: 'Fortalecer' },
  { skill: 'Gestión de proyectos ágiles (Scrum/Kanban)', consenso: 80, horizonte: '5+ años', accion: 'Fortalecer' },
  { skill: 'Pensamiento crítico y toma de decisiones complejas', consenso: 78, horizonte: '5+ años', accion: 'Fortalecer' },
  { skill: 'Liderazgo en entornos inciertos (VUCA)', consenso: 72, horizonte: '5+ años', accion: 'Fortalecer' },
]

const RECOMENDACIONES = [
  {
    accion: 'Retirar',
    color: 'bg-red-50 border-red-200 text-red-800',
    dot: 'bg-red-400',
    items: [
      'Eliminar o reducir a 1 crédito: "Contabilidad de costos manual" (semestre 4). Reemplazar con introducción a software ERP (SAP/Oracle).',
      'Eliminar módulo de "Sistemas de inventario físico" en Operaciones. Sustituir por gestión de supply chain con herramientas digitales.',
    ],
  },
  {
    accion: 'Rediseñar',
    color: 'bg-amber-50 border-amber-200 text-amber-800',
    dot: 'bg-amber-400',
    items: [
      'Transformar "Estadística aplicada" (semestre 3) en "Análisis de datos con IA": agregar módulo práctico de Python/Pandas y visualización con Tableau.',
      'Reorientar "Marketing II" hacia marketing de contenidos y analítica digital. Mantener fundamentos de branding y posicionamiento.',
      'Actualizar "Auditoría" con casos de auditoría continua, compliance automatizado y evidencia digital.',
    ],
  },
  {
    accion: 'Fortalecer',
    color: 'bg-blue-50 border-blue-200 text-blue-800',
    dot: 'bg-blue-400',
    items: [
      'Ampliar a 6 créditos: "Pensamiento estratégico" (semestre 6). Agregar simulaciones de crisis y decisión bajo incertidumbre.',
      'Crear electiva optativa: "Liderazgo en organizaciones ágiles". Alta demanda laboral (71% vacantes en el sector).',
    ],
  },
  {
    accion: 'Agregar',
    color: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    dot: 'bg-emerald-400',
    items: [
      'Nueva asignatura obligatoria (semestre 5): "Fundamentos de IA para Negocios" — 4 créditos. Consenso 91% en fuentes internacionales.',
      'Agregar certificación digital optativa: Google Data Analytics o IBM Data Science. Incrementa empleabilidad en 34% (dato STPS 2025).',
    ],
  },
]

function KpiBar({ label, score, invert }: { label: string; score: number; invert?: boolean }) {
  const pct = Math.round(score * 100)
  const isHigh = invert ? pct >= 60 : pct < 40
  const isMid = pct >= 40 && pct < 60
  const barColor = isHigh ? 'bg-red-400' : isMid ? 'bg-amber-400' : 'bg-emerald-400'
  const textColor = isHigh ? 'text-red-700' : isMid ? 'text-amber-700' : 'text-emerald-700'
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-600">{label}</span>
        <span className={`text-xs font-bold font-mono ${textColor}`}>{score.toFixed(2)}</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function AccionBadge({ accion }: { accion: string }) {
  const map: Record<string, string> = {
    Retirar: 'bg-red-100 text-red-700',
    Rediseñar: 'bg-amber-100 text-amber-700',
    Fortalecer: 'bg-blue-100 text-blue-700',
    Agregar: 'bg-emerald-100 text-emerald-700',
  }
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${map[accion] ?? 'bg-slate-100 text-slate-600'}`}>
      {accion}
    </span>
  )
}

export default function MuestraPage() {
  return (
    <div className="max-w-3xl mx-auto">
      {/* Sample banner */}
      <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
        <span className="text-amber-600 text-lg">⚠</span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-800">Esto es una muestra con datos ficticios</p>
          <p className="text-xs text-amber-700">El reporte real de tu institución incluirá los datos de tus carreras, KPIs históricos y comparativo vs. promedio nacional.</p>
        </div>
        <Link
          href="/pertinencia"
          className="shrink-0 px-3 py-1.5 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700 transition-colors whitespace-nowrap"
        >
          Solicitar el mío →
        </Link>
      </div>

      {/* Report cover */}
      <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-700 to-indigo-900 px-8 py-8 text-white">
          <p className="text-indigo-300 text-xs font-semibold uppercase tracking-widest mb-1">Observatorio de Impacto IA en Educación y Empleo</p>
          <h1 className="text-2xl font-bold mb-1">Estudio de Pertinencia Curricular</h1>
          <p className="text-indigo-200 text-base">Licenciatura en Administración de Empresas</p>
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-indigo-300">
            <span>Institución: <span className="text-white font-medium">████████████████</span></span>
            <span>Elaborado: <span className="text-white font-medium">Mayo 2026</span></span>
            <span>Analista: <span className="text-white font-medium">Samuel Ruiz — OIA-EE</span></span>
          </div>
        </div>

        <div className="px-8 py-8 space-y-10 bg-white">
          {/* D1–D4 KPIs */}
          <section>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-4">1. Diagnóstico de indicadores clave</h2>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <KpiBar label="D1 — Obsolescencia por automatización IA" score={0.58} />
                <KpiBar label="D2 — Oportunidades emergentes IA" score={0.61} invert />
                <KpiBar label="D3 — Demanda laboral en vacantes activas" score={0.53} invert />
              </div>
              <div className="space-y-3">
                <KpiBar label="D6 — Perfil estudiantil (matrícula vs. riesgo)" score={0.44} />
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 mt-1">
                  <p className="text-xs font-semibold text-amber-800 mb-0.5">Urgencia curricular</p>
                  <p className="text-2xl font-bold font-mono text-amber-700">65 <span className="text-sm font-normal">/ 100</span></p>
                  <p className="text-[11px] text-amber-600 mt-0.5">Urgencia media-alta — intervención recomendada antes de 2027</p>
                </div>
              </div>
            </div>
          </section>

          {/* Comparativo nacional */}
          <section>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-4">2. Comparativo vs. promedio nacional</h2>
            <div className="overflow-hidden rounded-lg border border-slate-100">
              <table className="w-full text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-4 py-2 text-slate-500 font-medium">Indicador</th>
                    <th className="text-right px-4 py-2 text-slate-500 font-medium">Esta carrera</th>
                    <th className="text-right px-4 py-2 text-slate-500 font-medium">Promedio nacional</th>
                    <th className="text-right px-4 py-2 text-slate-500 font-medium">Δ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {[
                    { ind: 'D1 Obsolescencia', val: '0.58', nac: '0.51', delta: '+0.07', pos: false },
                    { ind: 'D2 Oportunidades', val: '0.61', nac: '0.57', delta: '+0.04', pos: true },
                    { ind: 'D3 Demanda laboral', val: '0.53', nac: '0.49', delta: '+0.04', pos: true },
                    { ind: 'Urgencia curricular', val: '65/100', nac: '48/100', delta: '+17', pos: false },
                  ].map(row => (
                    <tr key={row.ind} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-medium text-slate-700">{row.ind}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-800">{row.val}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-500">{row.nac}</td>
                      <td className={`px-4 py-2.5 text-right font-mono font-semibold ${row.pos ? 'text-emerald-600' : 'text-red-600'}`}>{row.delta}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-slate-400 mt-2">Promedio nacional calculado sobre 847 carreras monitoreadas en OIA-EE al 01/05/2026.</p>
          </section>

          {/* Skills declining */}
          <section>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-1">3. Habilidades en declive — riesgo de obsolescencia</h2>
            <p className="text-xs text-slate-500 mb-4">Convergencia de 5 fuentes: WEF Future of Jobs 2025, McKinsey Global Institute, CEPAL, Frey-Osborne (Oxford), Anthropic Economic Index.</p>
            <div className="overflow-hidden rounded-lg border border-red-100">
              <table className="w-full text-xs">
                <thead className="bg-red-50">
                  <tr>
                    <th className="text-left px-4 py-2 text-red-600 font-semibold">Habilidad</th>
                    <th className="text-right px-4 py-2 text-red-600 font-semibold">Consenso</th>
                    <th className="text-right px-4 py-2 text-red-600 font-semibold">Horizonte</th>
                    <th className="text-right px-4 py-2 text-red-600 font-semibold">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-red-50">
                  {DECLINING.map(s => (
                    <tr key={s.skill} className="hover:bg-red-50/50">
                      <td className="px-4 py-2.5 text-slate-700">{s.skill}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-600">{s.consenso}%</td>
                      <td className="px-4 py-2.5 text-right text-slate-500">{s.horizonte}</td>
                      <td className="px-4 py-2.5 text-right"><AccionBadge accion={s.accion} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Skills growing */}
          <section>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-4">4. Habilidades en crecimiento — oportunidades curriculares</h2>
            <div className="overflow-hidden rounded-lg border border-emerald-100">
              <table className="w-full text-xs">
                <thead className="bg-emerald-50">
                  <tr>
                    <th className="text-left px-4 py-2 text-emerald-700 font-semibold">Habilidad</th>
                    <th className="text-right px-4 py-2 text-emerald-700 font-semibold">Consenso</th>
                    <th className="text-right px-4 py-2 text-emerald-700 font-semibold">Horizonte</th>
                    <th className="text-right px-4 py-2 text-emerald-700 font-semibold">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-50">
                  {GROWING.map(s => (
                    <tr key={s.skill} className="hover:bg-emerald-50/50">
                      <td className="px-4 py-2.5 text-slate-700">{s.skill}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-600">{s.consenso}%</td>
                      <td className="px-4 py-2.5 text-right text-slate-500">{s.horizonte}</td>
                      <td className="px-4 py-2.5 text-right"><AccionBadge accion={s.accion} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Recomendaciones */}
          <section>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-4">5. Recomendaciones accionables por competencia</h2>
            <div className="space-y-4">
              {RECOMENDACIONES.map(r => (
                <div key={r.accion} className={`rounded-lg border p-4 ${r.color}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${r.dot}`} />
                    <span className="text-xs font-bold uppercase tracking-wide">{r.accion}</span>
                  </div>
                  <ul className="space-y-1.5">
                    {r.items.map((item, i) => (
                      <li key={i} className="text-xs leading-relaxed flex gap-2">
                        <span className="shrink-0 mt-0.5">→</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          {/* Conclusión */}
          <section>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-3">6. Conclusión y próximos pasos</h2>
            <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100 text-sm text-indigo-900 leading-relaxed space-y-2">
              <p>
                La Licenciatura en Administración de Empresas presenta una <strong>urgencia curricular media-alta (65/100)</strong>, por encima del promedio nacional de las carreras monitoreadas.
                El principal riesgo es la concentración de créditos en habilidades con horizonte de obsolescencia ≤2 años (contabilidad manual, inventarios físicos).
              </p>
              <p>
                La oportunidad de diferenciación es clara: las IES que incorporen analítica de datos con IA y gestión ágil en los próximos 12 meses tendrán ventaja en empleabilidad y en la percepción del mercado laboral.
              </p>
              <p className="font-medium">
                Recomendación: iniciar revisión curricular en los semestres 3–5 en el ciclo escolar 2026–2027.
              </p>
            </div>
          </section>

          {/* Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <p className="text-[10px] text-slate-400">OIA-EE — Observatorio de Impacto IA en Educación y Empleo · oia-ee.mx</p>
            <p className="text-[10px] text-slate-400">Metodología disponible en oia-ee.mx/metodologia</p>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="mt-8 p-6 rounded-xl bg-indigo-50 border border-indigo-200 text-center">
        <p className="text-sm font-semibold text-indigo-900 mb-1">¿Quieres este reporte para tu carrera?</p>
        <p className="text-xs text-indigo-700 mb-4">Gratuito. Sin compromisos. Sam te contacta en 24 horas hábiles.</p>
        <Link
          href="/pertinencia"
          className="inline-flex items-center justify-center px-6 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors"
        >
          Solicitar mi estudio de pertinencia →
        </Link>
      </div>
    </div>
  )
}

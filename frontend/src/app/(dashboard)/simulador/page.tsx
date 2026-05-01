'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthenticated, getStoredIesId } from '@/lib/auth'
import { postSimular, getEscenarios, buscarCarreras } from '@/lib/api'
import type { SimResult, EscenarioHistorial } from '@/lib/types'
import Card from '@/components/ui/Card'
import SectionHeader from '@/components/ui/SectionHeader'

type CarreraHit = { id: string; nombre: string; area_conocimiento: string | null }

const D1_INPUTS = [
  { key: 'iva' as const, label: 'IVA', nombre: 'Índice de Vulnerabilidad a Automatización', peso: '50%', desc: 'Proporción de tareas de la carrera susceptibles de ser automatizadas por IA.' },
  { key: 'bes' as const, label: 'BES', nombre: 'Brecha Educación–Sector', peso: '30%', desc: 'Distancia entre competencias enseñadas y las que demanda el mercado laboral actual.' },
  { key: 'vac' as const, label: 'VAC', nombre: 'Vacantes con Requisito IA', peso: '20%', desc: 'Fracción de ofertas de empleo del sector que ya exigen habilidades de IA.' },
]
const D2_INPUTS = [
  { key: 'ioe' as const, label: 'IOE', nombre: 'Índice de Oportunidades Emergentes', peso: '40%', desc: 'Volumen de nuevos empleos creados por la IA en el sector de la carrera.' },
  { key: 'ihe' as const, label: 'IHE', nombre: 'Índice de Habilidades de Empleabilidad', peso: '35%', desc: 'Cobertura curricular de habilidades híbridas (técnicas + soft) demandadas.' },
  { key: 'iea' as const, label: 'IEA', nombre: 'Índice de Empleabilidad Absoluta', peso: '25%', desc: 'Tasa de inserción laboral en los primeros 12 meses post-egreso.' },
]

function d1Color(s: number) {
  if (s < 0.33) return { bar: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50', label: 'Riesgo Bajo' }
  if (s < 0.66) return { bar: 'bg-amber-400', text: 'text-amber-700', bg: 'bg-amber-50', label: 'Riesgo Medio' }
  return { bar: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50', label: 'Riesgo Alto' }
}
function d2Color(s: number) {
  if (s >= 0.66) return { bar: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50', label: 'Oportunidad Alta' }
  if (s >= 0.33) return { bar: 'bg-amber-400', text: 'text-amber-700', bg: 'bg-amber-50', label: 'Oportunidad Media' }
  return { bar: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50', label: 'Oportunidad Baja' }
}

function ScoreBar({ score, colorFn }: { score: number; colorFn: (s: number) => ReturnType<typeof d1Color> }) {
  const c = colorFn(score)
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <span className={`text-3xl font-bold font-mono ${c.text}`}>{score.toFixed(3)}</span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>{c.label}</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2.5">
        <div className={`h-2.5 rounded-full transition-all duration-500 ${c.bar}`} style={{ width: `${score * 100}%` }} />
      </div>
    </div>
  )
}

function SliderInput({
  value, onChange, label, nombre, peso, desc,
}: { value: number; onChange: (v: number) => void; label: string; nombre: string; peso: string; desc: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between">
        <div>
          <span className="text-xs font-bold text-slate-700 font-mono">{label}</span>
          <span className="ml-1.5 text-xs text-slate-500">{nombre}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400">peso {peso}</span>
          <input
            type="number"
            min={0} max={1} step={0.01}
            value={value}
            onChange={e => onChange(Math.min(1, Math.max(0, parseFloat(e.target.value) || 0)))}
            className="w-16 text-xs font-mono border border-slate-200 rounded px-1.5 py-0.5 text-right focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
        </div>
      </div>
      <input
        type="range" min={0} max={1} step={0.01}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full accent-indigo-600"
      />
      <p className="text-[10px] text-slate-400 leading-tight">{desc}</p>
    </div>
  )
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { dateStyle: 'short' })
}

const EMPTY_INPUTS = { iva: 0.5, bes: 0.4, vac: 0.3, ioe: 0.4, ihe: 0.5, iea: 0.6 }

export default function SimuladorPage() {
  const router = useRouter()
  const [iesId, setIesId] = useState<string | null>(null)
  const [inputs, setInputs] = useState(EMPTY_INPUTS)
  const [carreraQuery, setCarreraQuery] = useState('')
  const [carreraHits, setCarreraHits] = useState<CarreraHit[]>([])
  const [selectedCarrera, setSelectedCarrera] = useState<CarreraHit | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [simulating, setSimulating] = useState(false)
  const [result, setResult] = useState<SimResult | null>(null)
  const [historial, setHistorial] = useState<EscenarioHistorial[]>([])
  const [histTotal, setHistTotal] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isAuthenticated()) { router.replace('/login'); return }
    const id = getStoredIesId()
    setIesId(id)
    loadHistorial()
  }, [router])

  useEffect(() => {
    if (carreraQuery.length < 2) { setCarreraHits([]); return }
    const t = setTimeout(async () => {
      const hits = await buscarCarreras(carreraQuery)
      setCarreraHits(hits)
      setShowDropdown(true)
    }, 250)
    return () => clearTimeout(t)
  }, [carreraQuery])

  async function loadHistorial() {
    try {
      const data = await getEscenarios({ limit: 15 })
      setHistorial(data.escenarios)
      setHistTotal(data.total)
    } catch { /* silent */ }
  }

  function set(k: keyof typeof EMPTY_INPUTS) {
    return (v: number) => setInputs(prev => ({ ...prev, [k]: v }))
  }

  // Live preview scores (client-side calculation)
  const previewD1 = +(inputs.iva * 0.5 + inputs.bes * 0.3 + inputs.vac * 0.2).toFixed(4)
  const previewD2 = +(inputs.ioe * 0.4 + inputs.ihe * 0.35 + inputs.iea * 0.25).toFixed(4)

  async function handleSimular() {
    if (!iesId || !selectedCarrera) return
    setSimulating(true); setError(null)
    try {
      const res = await postSimular({
        ies_id: iesId,
        carrera_id: selectedCarrera.id,
        carrera_nombre: selectedCarrera.nombre,
        ...inputs,
      })
      setResult(res)
      loadHistorial()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al simular')
    } finally {
      setSimulating(false)
    }
  }

  function loadEscenario(e: EscenarioHistorial) {
    setInputs({ iva: e.iva, bes: e.bes, vac: e.vac, ioe: e.ioe, ihe: e.ihe, iea: e.iea })
    setSelectedCarrera({ id: e.carrera_id, nombre: e.carrera_nombre, area_conocimiento: null })
    setCarreraQuery(e.carrera_nombre)
    setResult(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="max-w-5xl mx-auto">
      <SectionHeader
        title="Simulador de Escenarios"
        subtitle="Ajusta indicadores clave y proyecta D1 (riesgo) y D2 (oportunidad) para cualquier carrera — sin afectar datos reales."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        {/* Panel izquierdo: inputs */}
        <div className="lg:col-span-2 space-y-4">
          {/* Carrera selector */}
          <Card className="p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Carrera a simular</p>
            <div className="relative" ref={searchRef}>
              <input
                type="text"
                placeholder="Buscar carrera..."
                value={carreraQuery}
                onChange={e => { setCarreraQuery(e.target.value); setSelectedCarrera(null) }}
                onFocus={() => carreraHits.length > 0 && setShowDropdown(true)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              {showDropdown && carreraHits.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                  {carreraHits.map(c => (
                    <li
                      key={c.id}
                      className="px-3 py-2 text-sm hover:bg-indigo-50 cursor-pointer"
                      onMouseDown={() => {
                        setSelectedCarrera(c)
                        setCarreraQuery(c.nombre)
                        setShowDropdown(false)
                      }}
                    >
                      <span className="font-medium text-slate-800">{c.nombre}</span>
                      {c.area_conocimiento && (
                        <span className="ml-2 text-xs text-slate-400">{c.area_conocimiento}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {selectedCarrera && (
              <p className="text-xs text-indigo-600 mt-1.5">
                Carrera seleccionada: <span className="font-semibold">{selectedCarrera.nombre}</span>
              </p>
            )}
          </Card>

          {/* D1 inputs */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">D1 — Riesgo de Obsolescencia</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Mayor valor = mayor riesgo de automatización</p>
              </div>
              <span className="text-lg font-bold font-mono text-red-600">{previewD1.toFixed(3)}</span>
            </div>
            <div className="space-y-4">
              {D1_INPUTS.map(f => (
                <SliderInput
                  key={f.key}
                  value={inputs[f.key]}
                  onChange={set(f.key)}
                  label={f.label}
                  nombre={f.nombre}
                  peso={f.peso}
                  desc={f.desc}
                />
              ))}
            </div>
          </Card>

          {/* D2 inputs */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">D2 — Oportunidad de Empleabilidad</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Mayor valor = mayor potencial de empleabilidad</p>
              </div>
              <span className="text-lg font-bold font-mono text-emerald-600">{previewD2.toFixed(3)}</span>
            </div>
            <div className="space-y-4">
              {D2_INPUTS.map(f => (
                <SliderInput
                  key={f.key}
                  value={inputs[f.key]}
                  onChange={set(f.key)}
                  label={f.label}
                  nombre={f.nombre}
                  peso={f.peso}
                  desc={f.desc}
                />
              ))}
            </div>
          </Card>

          <button
            onClick={handleSimular}
            disabled={simulating || !selectedCarrera || !iesId}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40 transition-colors"
          >
            {simulating ? 'Calculando...' : 'Guardar escenario'}
          </button>
          {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
          {!iesId && (
            <p className="text-amber-600 text-xs mt-1">Debes iniciar sesión para guardar escenarios.</p>
          )}
        </div>

        {/* Panel derecho: resultado */}
        <div className="space-y-4">
          <Card className="p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">Vista previa en vivo</p>
            <div className="space-y-5">
              <div>
                <p className="text-xs font-medium text-slate-600 mb-2">D1 — Obsolescencia Curricular</p>
                <ScoreBar score={previewD1} colorFn={d1Color} />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-600 mb-2">D2 — Empleabilidad</p>
                <ScoreBar score={previewD2} colorFn={d2Color} />
              </div>
            </div>
          </Card>

          {result && (
            <Card className="p-5 border-l-4 border-indigo-400">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Escenario guardado</p>
              <p className="text-sm font-semibold text-slate-800 mb-3 leading-tight">{result.carrera_nombre}</p>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1.5">D1 — Riesgo</p>
                  <ScoreBar score={result.d1_score} colorFn={d1Color} />
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1.5">D2 — Oportunidad</p>
                  <ScoreBar score={result.d2_score} colorFn={d2Color} />
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-3">{new Date(result.fecha).toLocaleString('es-MX')}</p>
            </Card>
          )}

          <Card className="p-4 bg-slate-50">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Fórmulas</p>
            <div className="space-y-1.5 text-[11px] font-mono text-slate-600">
              <p>D1 = IVA×0.5 + BES×0.3 + VAC×0.2</p>
              <p>D2 = IOE×0.4 + IHE×0.35 + IEA×0.25</p>
            </div>
          </Card>
        </div>
      </div>

      {/* Historial */}
      {historial.length > 0 && (
        <Card className="p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-800 text-sm">
              Historial de escenarios ({histTotal})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-2.5 text-left">Carrera</th>
                  <th className="px-4 py-2.5 text-center">D1</th>
                  <th className="px-4 py-2.5 text-center">D2</th>
                  <th className="px-4 py-2.5 text-center">IVA</th>
                  <th className="px-4 py-2.5 text-center">BES</th>
                  <th className="px-4 py-2.5 text-center">VAC</th>
                  <th className="px-4 py-2.5 text-center">IOE</th>
                  <th className="px-4 py-2.5 text-center">IHE</th>
                  <th className="px-4 py-2.5 text-center">IEA</th>
                  <th className="px-4 py-2.5 text-left">Fecha</th>
                  <th className="px-4 py-2.5 text-center">Acción</th>
                </tr>
              </thead>
              <tbody>
                {historial.map(e => {
                  const c1 = d1Color(e.d1_score)
                  const c2 = d2Color(e.d2_score)
                  return (
                    <tr key={e.id} className="border-t border-slate-50 hover:bg-slate-50">
                      <td className="px-4 py-2 font-medium text-slate-800 max-w-[160px] truncate">{e.carrera_nombre}</td>
                      <td className={`px-4 py-2 text-center font-mono font-semibold ${c1.text}`}>{e.d1_score.toFixed(3)}</td>
                      <td className={`px-4 py-2 text-center font-mono font-semibold ${c2.text}`}>{e.d2_score.toFixed(3)}</td>
                      <td className="px-4 py-2 text-center font-mono text-slate-500">{e.iva.toFixed(2)}</td>
                      <td className="px-4 py-2 text-center font-mono text-slate-500">{e.bes.toFixed(2)}</td>
                      <td className="px-4 py-2 text-center font-mono text-slate-500">{e.vac.toFixed(2)}</td>
                      <td className="px-4 py-2 text-center font-mono text-slate-500">{e.ioe.toFixed(2)}</td>
                      <td className="px-4 py-2 text-center font-mono text-slate-500">{e.ihe.toFixed(2)}</td>
                      <td className="px-4 py-2 text-center font-mono text-slate-500">{e.iea.toFixed(2)}</td>
                      <td className="px-4 py-2 text-slate-400">{fmtDate(e.fecha)}</td>
                      <td className="px-4 py-2 text-center">
                        <button
                          onClick={() => loadEscenario(e)}
                          className="text-indigo-600 hover:underline"
                        >
                          Reutilizar
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

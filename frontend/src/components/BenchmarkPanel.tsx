'use client'
import { useEffect, useState } from 'react'
import { getIesDetalle, getKpisNacionalResumen } from '@/lib/api'
import type { IesDetalle, KpisNacionalResumen } from '@/lib/types'

interface Props { iesId: string }

function CompareBar({
  label, iesVal, nacVal, invert = false,
}: { label: string; iesVal: number; nacVal: number; invert?: boolean }) {
  // invert=true: lower is better (D1 riesgo)
  const iesGood = invert ? iesVal <= nacVal : iesVal >= nacVal
  const delta = iesVal - nacVal
  const sign = delta >= 0 ? '+' : ''
  const iesColor = iesGood ? 'bg-emerald-500' : 'bg-red-500'
  const deltaColor = iesGood ? 'text-emerald-700' : 'text-red-600'

  return (
    <div className="mb-5">
      <div className="flex justify-between items-baseline mb-1.5">
        <span className="text-xs font-semibold text-slate-700">{label}</span>
        <span className={`text-xs font-bold font-mono ${deltaColor}`}>
          {sign}{(delta * 100).toFixed(1)} pp vs nacional
        </span>
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-16 text-[10px] text-slate-500 text-right shrink-0">Tu IES</span>
          <div className="flex-1 bg-slate-100 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${iesColor}`}
              style={{ width: `${Math.max(iesVal * 100, 2)}%` }}
            />
          </div>
          <span className="w-12 text-xs font-mono text-slate-700 text-right shrink-0">{iesVal.toFixed(3)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-16 text-[10px] text-slate-400 text-right shrink-0">Nacional</span>
          <div className="flex-1 bg-slate-100 rounded-full h-3">
            <div
              className="h-3 rounded-full bg-slate-400"
              style={{ width: `${Math.max(nacVal * 100, 2)}%` }}
            />
          </div>
          <span className="w-12 text-xs font-mono text-slate-400 text-right shrink-0">{nacVal.toFixed(3)}</span>
        </div>
      </div>
    </div>
  )
}

function InsightBadge({ text, good }: { text: string; good: boolean }) {
  return (
    <div className={`flex items-start gap-2 px-3 py-2 rounded-lg text-xs ${good ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
      <span className="mt-0.5 shrink-0">{good ? '✓' : '!'}</span>
      <span>{text}</span>
    </div>
  )
}

export default function BenchmarkPanel({ iesId }: Props) {
  const [ies, setIes] = useState<IesDetalle | null>(null)
  const [nac, setNac] = useState<KpisNacionalResumen | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getIesDetalle(iesId), getKpisNacionalResumen()])
      .then(([i, n]) => { setIes(i); setNac(n) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [iesId])

  if (loading) return <p className="text-slate-400 text-sm py-6">Cargando benchmarks...</p>
  if (!ies || !nac) return <p className="text-red-500 text-sm py-6">No se pudo cargar el benchmark.</p>

  const d1Good = ies.promedio_d1 <= nac.promedio_d1
  const d2Good = ies.promedio_d2 >= nac.promedio_d2
  const riesgoAltoRatio = ies.total_carreras > 0 ? ies.carreras_riesgo_alto / ies.total_carreras : 0
  const nacRiesgoAltoRatio = nac.total_carreras > 0 ? nac.carreras_riesgo_alto / nac.total_carreras : 0
  const riesgoGood = riesgoAltoRatio <= nacRiesgoAltoRatio

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">
            KPIs — Tu IES vs Media Nacional
          </p>
          <CompareBar
            label="D1 — Riesgo de Obsolescencia"
            iesVal={ies.promedio_d1}
            nacVal={nac.promedio_d1}
            invert
          />
          <CompareBar
            label="D2 — Oportunidad de Empleabilidad"
            iesVal={ies.promedio_d2}
            nacVal={nac.promedio_d2}
          />
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">
            Resumen ejecutivo
          </p>
          <div className="space-y-2 mb-4">
            <InsightBadge
              good={d1Good}
              text={d1Good
                ? `Tu riesgo promedio D1 (${ies.promedio_d1.toFixed(3)}) está ${((nac.promedio_d1 - ies.promedio_d1) * 100).toFixed(1)} pp por debajo de la media nacional — posición favorable.`
                : `Tu riesgo D1 (${ies.promedio_d1.toFixed(3)}) supera la media nacional (${nac.promedio_d1.toFixed(3)}) — priorizar actualización curricular.`
              }
            />
            <InsightBadge
              good={d2Good}
              text={d2Good
                ? `Tu empleabilidad D2 (${ies.promedio_d2.toFixed(3)}) supera la media nacional (${nac.promedio_d2.toFixed(3)}) — oferta bien alineada con demanda.`
                : `Tu D2 (${ies.promedio_d2.toFixed(3)}) está por debajo de la media nacional — hay oportunidad de mejora curricular en empleabilidad.`
              }
            />
            <InsightBadge
              good={riesgoGood}
              text={`${ies.carreras_riesgo_alto} de ${ies.total_carreras} carreras con riesgo alto (${(riesgoAltoRatio * 100).toFixed(0)}% vs ${(nacRiesgoAltoRatio * 100).toFixed(0)}% nacional).`}
            />
          </div>

          <div className="bg-slate-50 rounded-lg p-3 text-xs">
            <p className="font-semibold text-slate-700 mb-2">Datos de referencia nacional</p>
            <table className="w-full text-slate-600">
              <tbody>
                <tr><td className="py-0.5">Total carreras evaluadas</td><td className="text-right font-mono">{nac.total_carreras.toLocaleString('es-MX')}</td></tr>
                <tr><td className="py-0.5">Promedio D1 nacional</td><td className="text-right font-mono">{nac.promedio_d1.toFixed(3)}</td></tr>
                <tr><td className="py-0.5">Promedio D2 nacional</td><td className="text-right font-mono">{nac.promedio_d2.toFixed(3)}</td></tr>
                <tr><td className="py-0.5">Carreras riesgo alto</td><td className="text-right font-mono">{nac.carreras_riesgo_alto}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

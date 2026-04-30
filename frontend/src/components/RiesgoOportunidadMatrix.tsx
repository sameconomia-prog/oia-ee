'use client'
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts'
import type { CarreraKpi } from '@/lib/types'
import Link from 'next/link'

interface Props {
  carreras: CarreraKpi[]
}

interface Punto {
  id: string
  nombre: string
  d1: number
  d2: number
  cuadrante: 'estrella' | 'transformacion' | 'estable' | 'riesgo'
}

const CUADRANTE_COLOR: Record<Punto['cuadrante'], string> = {
  estrella:      '#10B981',  // verde — bajo riesgo, alta oportunidad
  transformacion:'#F59E0B',  // ámbar — alto riesgo, alta oportunidad
  estable:       '#6366f1',  // indigo — bajo riesgo, baja oportunidad
  riesgo:        '#EF4444',  // rojo   — alto riesgo, baja oportunidad
}

const CUADRANTE_LABEL: Record<Punto['cuadrante'], string> = {
  estrella:      'Estrella · bajo riesgo, alta oportunidad',
  transformacion:'En Transformación · alto riesgo, alta oportunidad',
  estable:       'Estable · bajo riesgo, baja oportunidad',
  riesgo:        'En Riesgo · alto riesgo, baja oportunidad',
}

function toCuadrante(d1: number, d2: number): Punto['cuadrante'] {
  if (d1 < 0.5 && d2 >= 0.5) return 'estrella'
  if (d1 >= 0.5 && d2 >= 0.5) return 'transformacion'
  if (d1 < 0.5 && d2 < 0.5)  return 'estable'
  return 'riesgo'
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: Punto }[] }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm text-xs max-w-[200px]">
      <p className="font-semibold text-slate-800 mb-1 leading-tight">{p.nombre}</p>
      <p className="font-mono text-slate-600">D1: <span className="font-bold text-red-600">{p.d1.toFixed(3)}</span></p>
      <p className="font-mono text-slate-600">D2: <span className="font-bold text-emerald-600">{p.d2.toFixed(3)}</span></p>
      <p className={`mt-1 text-[10px] font-medium`} style={{ color: CUADRANTE_COLOR[p.cuadrante] }}>
        {CUADRANTE_LABEL[p.cuadrante].split(' · ')[0]}
      </p>
    </div>
  )
}

export default function RiesgoOportunidadMatrix({ carreras }: Props) {
  const puntos: Punto[] = carreras
    .filter(c => c.kpi)
    .map(c => ({
      id: c.id,
      nombre: c.nombre,
      d1: c.kpi!.d1_obsolescencia.score,
      d2: c.kpi!.d2_oportunidades.score,
      cuadrante: toCuadrante(c.kpi!.d1_obsolescencia.score, c.kpi!.d2_oportunidades.score),
    }))

  if (puntos.length === 0) {
    return <p className="text-slate-400 text-sm py-6">Sin carreras con datos KPI.</p>
  }

  const counts: Record<Punto['cuadrante'], number> = {
    estrella: 0, transformacion: 0, estable: 0, riesgo: 0,
  }
  puntos.forEach(p => counts[p.cuadrante]++)

  return (
    <div>
      {/* Leyenda cuadrantes */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {(Object.entries(CUADRANTE_LABEL) as [Punto['cuadrante'], string][]).map(([k, label]) => (
          <div key={k} className="flex items-center gap-2 text-xs">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ background: CUADRANTE_COLOR[k] }} />
            <span className="text-slate-600 leading-tight">
              <span className="font-semibold">{label.split(' · ')[0]}</span>
              <span className="text-slate-400 ml-1">({counts[k]})</span>
            </span>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-2">
        <ResponsiveContainer width="100%" height={320}>
          <ScatterChart margin={{ top: 12, right: 20, bottom: 20, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              type="number" dataKey="d1" domain={[0, 1]} name="D1 Riesgo"
              tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => v.toFixed(1)}
              label={{ value: 'D1 — Riesgo →', position: 'insideBottom', offset: -8, fontSize: 10, fill: '#ef4444' }}
            />
            <YAxis
              type="number" dataKey="d2" domain={[0, 1]} name="D2 Oportunidad"
              tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => v.toFixed(1)}
              label={{ value: 'D2 — Oportunidad →', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10, fill: '#10b981' }}
            />
            {/* Ejes de cuadrantes */}
            <ReferenceLine x={0.5} stroke="#cbd5e1" strokeDasharray="4 2" strokeWidth={1.5} />
            <ReferenceLine y={0.5} stroke="#cbd5e1" strokeDasharray="4 2" strokeWidth={1.5} />
            <Tooltip content={<CustomTooltip />} />
            <Scatter data={puntos} isAnimationActive={false}>
              {puntos.map((p) => (
                <Cell key={p.id} fill={CUADRANTE_COLOR[p.cuadrante]} fillOpacity={0.75} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
        <p className="text-[10px] text-slate-400 text-center mt-1">
          Cada punto = 1 carrera · pasa el cursor para ver nombre y scores
        </p>
      </div>

      {/* Tabla resumida */}
      {counts.riesgo > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold text-red-600 mb-2">
            Carreras en riesgo prioritario ({counts.riesgo})
          </p>
          <div className="space-y-1">
            {puntos
              .filter(p => p.cuadrante === 'riesgo')
              .sort((a, b) => b.d1 - a.d1)
              .slice(0, 5)
              .map(p => (
                <div key={p.id} className="flex items-center justify-between text-xs bg-red-50 rounded px-3 py-1.5">
                  <Link href={`/carreras/${p.id}`} className="text-slate-700 hover:text-red-700 hover:underline font-medium truncate max-w-[60%]">
                    {p.nombre}
                  </Link>
                  <div className="flex gap-3 font-mono text-slate-500 shrink-0">
                    <span className="text-red-600">D1: {p.d1.toFixed(2)}</span>
                    <span>D2: {p.d2.toFixed(2)}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

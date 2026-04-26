'use client'
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts'

interface PredPoint {
  fecha_prediccion: string
  valor_predicho: number
  ci_80_lower: number | null
  ci_80_upper: number | null
  ci_95_lower: number | null
  ci_95_upper: number | null
}

interface HistPoint {
  fecha: string
  valor: number
}

interface FanChartProps {
  historico: HistPoint[]
  predicciones: PredPoint[]
  kpiNombre: string
  titulo?: string
}

export default function FanChart({ historico, predicciones, kpiNombre, titulo }: FanChartProps) {
  const histData = historico.map(h => ({
    fecha: h.fecha,
    historico: h.valor,
    ci95: null as [number, number] | null,
    ci80: null as [number, number] | null,
    predicho: null as number | null,
  }))

  const predData = predicciones.map(p => ({
    fecha: p.fecha_prediccion,
    historico: null as number | null,
    predicho: p.valor_predicho,
    ci95: p.ci_95_lower != null && p.ci_95_upper != null
      ? [p.ci_95_lower, p.ci_95_upper] as [number, number]
      : null,
    ci80: p.ci_80_lower != null && p.ci_80_upper != null
      ? [p.ci_80_lower, p.ci_80_upper] as [number, number]
      : null,
  }))

  const allData = [...histData, ...predData]

  return (
    <div className="w-full">
      {titulo && <h3 className="text-sm font-medium text-gray-700 mb-2">{titulo}</h3>}
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={allData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="fecha"
            tick={{ fontSize: 11 }}
            tickFormatter={(v: string) => v?.slice(0, 7) ?? ''}
          />
          <YAxis
            domain={[0, 1]}
            tickFormatter={(v: number) => v.toFixed(1)}
            tick={{ fontSize: 11 }}
          />
          <Tooltip
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any) =>
              [typeof value === 'number' ? value.toFixed(3) : String(value ?? '')]
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            labelFormatter={(l: any) => `Fecha: ${String(l ?? '')}`}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Area
            dataKey="ci95"
            fill="#93c5fd"
            stroke="none"
            fillOpacity={0.25}
            name="IC 95%"
            connectNulls={false}
          />
          <Area
            dataKey="ci80"
            fill="#3b82f6"
            stroke="none"
            fillOpacity={0.35}
            name="IC 80%"
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="historico"
            stroke="#64748b"
            strokeWidth={2}
            dot={false}
            name={`${kpiNombre} histórico`}
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="predicho"
            stroke="#2563eb"
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={false}
            name={`${kpiNombre} predicho`}
            connectNulls={false}
          />
          <ReferenceLine
            x={new Date().toISOString().slice(0, 10)}
            stroke="#94a3b8"
            strokeDasharray="4 4"
            label={{ value: 'Hoy', position: 'top', fontSize: 11 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

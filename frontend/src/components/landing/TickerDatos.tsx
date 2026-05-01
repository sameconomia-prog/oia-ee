// frontend/src/components/landing/TickerDatos.tsx
interface TickerData {
  total_ies: number
  total_carreras: number
  total_vacantes: number
  total_noticias: number
  iva_promedio?: number
  urgencia_curricular?: number
}

interface TickerDatosProps {
  data: TickerData
}

const items = (data: TickerData) => [
  { label: 'IES en cobertura', value: data.total_ies.toLocaleString('es-MX') },
  { label: 'Carreras analizadas', value: data.total_carreras.toLocaleString('es-MX') },
  { label: 'Vacantes monitoreadas', value: data.total_vacantes.toLocaleString('es-MX') },
  { label: 'Noticias procesadas', value: data.total_noticias.toLocaleString('es-MX') },
  ...(data.urgencia_curricular !== undefined
    ? [{ label: 'Urgencia curricular global', value: `${data.urgencia_curricular}/100` }]
    : data.iva_promedio !== undefined
    ? [{ label: 'IVA promedio nacional', value: data.iva_promedio.toFixed(2) }]
    : []),
]

export default function TickerDatos({ data }: TickerDatosProps) {
  return (
    <div className="bg-[#1D4ED8] text-white py-3">
      <div className="max-w-7xl mx-auto px-4 flex flex-wrap justify-center gap-x-8 gap-y-2">
        {items(data).map(({ label, value }) => (
          <span key={label} className="text-sm font-medium">
            <span className="font-bold text-white">{value}</span>
            <span className="text-blue-200 ml-1">{label}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

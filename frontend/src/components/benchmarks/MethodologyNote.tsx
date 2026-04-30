export default function MethodologyNote() {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
      <strong className="font-semibold">Nota metodológica:</strong>{' '}
      Los reportes globales (WEF, Anthropic, McKinsey, CEPAL, Frey-Osborne) no mencionan
      carreras universitarias mexicanas — usan clasificaciones O*NET, SOC e ISCO. La conexión
      se hace a través de <strong>habilidades</strong>: cada reporte cita una habilidad afectada,
      OIA-EE la mapea al plan de estudios de la carrera. Esto hace la conexión citable y auditable.
      Las habilidades sin cobertura en ninguna fuente se muestran como{' '}
      <span className="font-mono font-bold text-gray-500">—</span> (sin datos), no como resilientes.
    </div>
  )
}

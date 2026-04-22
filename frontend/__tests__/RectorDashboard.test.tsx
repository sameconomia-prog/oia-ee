import { render, screen, waitFor } from '@testing-library/react'
import RectorDashboard from '@/components/RectorDashboard'
import * as api from '@/lib/api'

jest.mock('@/lib/api')
const mockGetRectorData = api.getRectorData as jest.MockedFunction<typeof api.getRectorData>

const mockData = {
  ies: { id: '1', nombre: 'Universidad Humanitas', nombre_corto: 'UH' },
  carreras: [
    {
      id: 'c1',
      nombre: 'Derecho',
      matricula: 450,
      kpi: {
        d1_obsolescencia: { score: 0.82, iva: 0.75, bes: 0.80, vac: 0.90 },
        d2_oportunidades: { score: 0.35, ioe: 0.40, ihe: 0.30, iea: 0.35 },
      },
    },
  ],
  alertas: [
    {
      id: 'a1',
      carrera_nombre: 'Derecho',
      tipo: 'ambos' as const,
      severidad: 'alta' as const,
      titulo: 'D1 crítico y D2 bajo',
      mensaje: 'D1 = 0.82 · D2 = 0.35',
      fecha: '2026-04-21T00:00:00',
    },
  ],
}

test('renderiza nombre de la IES', async () => {
  mockGetRectorData.mockResolvedValue(mockData)
  render(<RectorDashboard iesId="1" />)
  await waitFor(() => expect(screen.getByText('Universidad Humanitas')).toBeInTheDocument())
})

test('muestra tabla con carreras', async () => {
  mockGetRectorData.mockResolvedValue(mockData)
  render(<RectorDashboard iesId="1" />)
  await waitFor(() => expect(screen.getAllByText('Derecho').length).toBeGreaterThan(0))
})

test('muestra panel de alertas activas', async () => {
  mockGetRectorData.mockResolvedValue(mockData)
  render(<RectorDashboard iesId="1" />)
  await waitFor(() => expect(screen.getByText('Actuales (1)')).toBeInTheDocument())
})

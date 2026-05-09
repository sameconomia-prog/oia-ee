import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RectorDashboard from '@/components/RectorDashboard'
import * as api from '@/lib/api'
import * as pdf from '@/lib/reporte-pdf'

jest.mock('@/lib/api')
jest.mock('@/lib/reporte-pdf', () => ({ generarReporteRector: jest.fn() }))
const mockGetRectorData = api.getRectorData as jest.MockedFunction<typeof api.getRectorData>
const mockGetKpisIes = api.getKpisIes as jest.MockedFunction<typeof api.getKpisIes>
const mockGetBenchmarkCareers = api.getBenchmarkCareers as jest.MockedFunction<typeof api.getBenchmarkCareers>

const mockData = {
  ies: { id: '1', nombre: 'Universidad Humanitas', nombre_corto: 'UH' },
  carreras: [
    {
      id: 'c1',
      nombre: 'Derecho',
      matricula: 450,
      kpi: {
        carrera_id: 'c1',
        d1_obsolescencia: { score: 0.82, iva: 0.75, bes: 0.80, vac: 0.90 },
        d2_oportunidades: { score: 0.35, ioe: 0.40, ihe: 0.30, iea: 0.35 },
        d3_mercado: { score: 0.5, tdm: 0.5, tvc: 0.5, brs: 0.5, ice: 0.5 },
        d6_estudiantil: { score: 0.4, iei: 0.4, crc: 0.4, roi_e: 0.4 },
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

beforeEach(() => {
  mockGetKpisIes.mockResolvedValue(null)
  mockGetBenchmarkCareers.mockResolvedValue([])
})

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

test('botón Descargar PDF existe y llama generarReporte', async () => {
  mockGetRectorData.mockResolvedValue(mockData)
  const mockGenerar = jest.mocked(pdf.generarReporteRector).mockImplementation(() => {})
  render(<RectorDashboard iesId="1" />)
  await waitFor(() => screen.getByText('Universidad Humanitas'))
  await userEvent.click(screen.getByRole('button', { name: /descargar pdf/i }))
  expect(mockGenerar).toHaveBeenCalledWith(mockData)
})

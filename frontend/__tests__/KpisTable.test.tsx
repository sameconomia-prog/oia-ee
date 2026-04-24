import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import KpisTable from '@/components/KpisTable'
import * as api from '@/lib/api'

jest.mock('@/lib/api')

const kpiRed = {
  d1_obsolescencia: { score: 0.75, iva: 0.8, bes: 0.7, vac: 0.6 },
  d2_oportunidades: { score: 0.35, ioe: 0.3, ihe: 0.2, iea: 0.4 },
  d3_mercado: { score: 0.5, tdm: 0.5, tvc: 0.5, brs: 0.5, ice: 0.5 },
  d6_estudiantil: { score: 0.4, iei: 0.4, crc: 0.4, roi_e: 0.4 },
}
const kpiGreen = {
  d1_obsolescencia: { score: 0.30, iva: 0.3, bes: 0.3, vac: 0.3 },
  d2_oportunidades: { score: 0.80, ioe: 0.8, ihe: 0.8, iea: 0.8 },
  d3_mercado: { score: 0.7, tdm: 0.7, tvc: 0.7, brs: 0.7, ice: 0.7 },
  d6_estudiantil: { score: 0.7, iei: 0.7, crc: 0.7, roi_e: 0.7 },
}

beforeEach(() => {
  jest.mocked(api.getCarrerasPublico).mockResolvedValue([
    { id: 'c1', nombre: 'Contabilidad', matricula: 200, kpi: { carrera_id: 'c1', ...kpiRed } },
    { id: 'c2', nombre: 'Ingeniería', matricula: 300, kpi: { carrera_id: 'c2', ...kpiGreen } },
  ])
})

it('renderiza carreras con nombres reales', async () => {
  render(<KpisTable />)
  await waitFor(() => screen.getByText('Contabilidad'))
  expect(screen.getByText('Ingeniería')).toBeInTheDocument()
})

it('renderiza semáforo rojo en D1 score alto (0.75)', async () => {
  render(<KpisTable />)
  await waitFor(() => screen.getByText('Contabilidad'))
  const redDots = document.querySelectorAll('.bg-red-500')
  expect(redDots.length).toBeGreaterThan(0)
})

it('ordena por D1 asc al hacer click en Score D1', async () => {
  render(<KpisTable />)
  await waitFor(() => screen.getByText('Contabilidad'))
  const rows = screen.getAllByText(/Contabilidad|Ingeniería/)
  // Default sort desc: Contabilidad (D1=0.75) primero
  expect(rows[0].textContent).toBe('Contabilidad')
  // Click Score D1 header → sort asc → Ingeniería (D1=0.30) primero
  await userEvent.click(screen.getAllByText(/Score/)[0])
  const rowsAfter = screen.getAllByText(/Contabilidad|Ingeniería/)
  expect(rowsAfter[0].textContent).toBe('Ingeniería')
})

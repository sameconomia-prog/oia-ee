import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import KpisTable from '@/components/KpisTable'
import * as api from '@/lib/api'

jest.mock('@/lib/api')

const kpiRed = {
  d1_obsolescencia: { score: 0.75, iva: 0.8, bes: 0.7, vac: 0.6 },
  d2_oportunidades: { score: 0.35, ioe: 0.3, ihe: 0.2, iea: 0.4 },
}
const kpiGreen = {
  d1_obsolescencia: { score: 0.30, iva: 0.3, bes: 0.3, vac: 0.3 },
  d2_oportunidades: { score: 0.80, ioe: 0.8, ihe: 0.8, iea: 0.8 },
}

beforeEach(() => {
  jest.mocked(api.getKpis).mockImplementation(async (id) => {
    if (id === 1) return kpiRed
    if (id === 2) return kpiGreen
    return null
  })
})

it('renders semáforo rojo en D1 score alto (0.75)', async () => {
  render(<KpisTable />)
  await waitFor(() => screen.getByText('Carrera #1'))
  // D1=0.75 > 0.70 → dot has bg-red-500
  const redDots = document.querySelectorAll('.bg-red-500')
  expect(redDots.length).toBeGreaterThan(0)
})

it('ordena por D1 asc al hacer click en Score D1', async () => {
  render(<KpisTable />)
  await waitFor(() => screen.getByText('Carrera #1'))
  const rows = screen.getAllByText(/Carrera #\d/)
  // Default sort desc: Carrera #1 (D1=0.75) first
  expect(rows[0].textContent).toBe('Carrera #1')
  // Click Score D1 header to sort asc
  await userEvent.click(screen.getAllByText(/Score/)[0])
  const rowsAfter = screen.getAllByText(/Carrera #\d/)
  expect(rowsAfter[0].textContent).toBe('Carrera #2')
})

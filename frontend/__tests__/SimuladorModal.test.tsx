import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SimuladorModal from '@/components/SimuladorModal'
import type { CarreraKpi } from '@/lib/types'
import * as api from '@/lib/api'

jest.mock('@/lib/api')
const mockPostSimular = api.postSimular as jest.MockedFunction<typeof api.postSimular>

beforeEach(() => {
  mockPostSimular.mockReset()
})

const carreraConKpi: CarreraKpi = {
  id: 'c1',
  nombre: 'Derecho',
  matricula: 450,
  kpi: {
    d1_obsolescencia: { score: 0.82, iva: 0.75, bes: 0.80, vac: 0.60 },
    d2_oportunidades: { score: 0.35, ioe: 0.40, ihe: 0.35, iea: 0.45 },
  },
}

test('renderiza inputs pre-llenados con valores actuales del kpi', () => {
  render(<SimuladorModal carrera={carreraConKpi} iesId="ies1" onClose={() => {}} />)
  const ivaInput = screen.getByLabelText('IVA') as HTMLInputElement
  expect(ivaInput.value).toBe('0.75')
  const besInput = screen.getByLabelText('BES') as HTMLInputElement
  expect(besInput.value).toBe('0.8')
})

test('calcula preview d1/d2 en tiempo real al cambiar input', () => {
  render(<SimuladorModal carrera={carreraConKpi} iesId="ies1" onClose={() => {}} />)
  const ivaInput = screen.getByLabelText('IVA')
  fireEvent.change(ivaInput, { target: { value: '1.0' } })
  // D1 = 1.0*0.5 + 0.80*0.3 + 0.60*0.2 = 0.5 + 0.24 + 0.12 = 0.86 → rendered as "0.8600"
  expect(screen.getByText(/0\.86/)).toBeInTheDocument()
})

test('llama postSimular y muestra confirmación al hacer click en Guardar', async () => {
  mockPostSimular.mockResolvedValue({
    id: 'esc1',
    carrera_nombre: 'Derecho',
    d1_score: 0.735,
    d2_score: 0.395,
    iva: 0.75, bes: 0.80, vac: 0.60,
    ioe: 0.40, ihe: 0.35, iea: 0.45,
    fecha: '2026-04-21T05:00:00',
  })
  render(<SimuladorModal carrera={carreraConKpi} iesId="ies1" onClose={() => {}} />)
  fireEvent.click(screen.getByText('Guardar escenario'))
  await waitFor(() =>
    expect(mockPostSimular).toHaveBeenCalledWith(
      expect.objectContaining({
        ies_id: 'ies1',
        carrera_id: 'c1',
        carrera_nombre: 'Derecho',
        iva: 0.75,
      })
    )
  )
  await waitFor(() => expect(screen.getByText(/Escenario guardado/)).toBeInTheDocument())
})

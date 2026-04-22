import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AlertasPanel from '@/components/AlertasPanel'
import type { AlertaItem } from '@/lib/types'
import * as api from '@/lib/api'

jest.mock('@/lib/api')
const mockGetAlertas = api.getAlertas as jest.MockedFunction<typeof api.getAlertas>
const mockMarkAlertaRead = api.markAlertaRead as jest.MockedFunction<typeof api.markAlertaRead>

beforeEach(() => {
  mockGetAlertas.mockReset()
  mockMarkAlertaRead.mockReset()
})

const alertaMock: AlertaItem = {
  id: 'a1',
  carrera_nombre: 'Derecho',
  tipo: 'ambos',
  severidad: 'alta',
  titulo: 'D1 crítico y D2 bajo',
  mensaje: 'D1 = 0.82 · D2 = 0.35',
  fecha: '2026-04-21T00:00:00',
}

test('muestra alerta con severidad y carrera_nombre', () => {
  render(<AlertasPanel alertas={[alertaMock]} iesId="test-ies" />)
  expect(screen.getByText('Derecho')).toBeInTheDocument()
  expect(screen.getByText('alta')).toBeInTheDocument()
  expect(screen.getByText('D1 alto + D2 bajo')).toBeInTheDocument()
})

test('muestra mensaje vacío cuando no hay alertas', () => {
  render(<AlertasPanel alertas={[]} iesId="test-ies" />)
  expect(screen.getByText(/Sin alertas activas/)).toBeInTheDocument()
})

test('ordena alertas con alta primero', () => {
  const media: AlertaItem = {
    id: 'b1',
    carrera_nombre: 'Contabilidad',
    tipo: 'd2_bajo',
    severidad: 'media',
    titulo: 'D2 bajo',
    mensaje: null,
    fecha: '2026-04-21T00:00:00',
  }
  const { container } = render(<AlertasPanel alertas={[media, alertaMock]} iesId="test-ies" />)
  const text = container.textContent ?? ''
  expect(text.indexOf('Derecho')).toBeLessThan(text.indexOf('Contabilidad'))
})

test('muestra tab historial y carga alertas desde DB', async () => {
  mockGetAlertas.mockResolvedValue({
    alertas: [
      {
        id: 'db1',
        ies_id: 'test-ies',
        carrera_id: 'c1',
        carrera_nombre: 'Medicina',
        tipo: 'd2_bajo' as const,
        severidad: 'media' as const,
        titulo: 'D2 bajo',
        mensaje: null,
        fecha: '2026-04-21T03:00:00',
        leida: false,
      },
    ],
    total: 1,
  })
  render(<AlertasPanel alertas={[]} iesId="test-ies" />)
  fireEvent.click(screen.getByText(/Historial/))
  await waitFor(() => expect(screen.getByText('Medicina')).toBeInTheDocument())
  expect(mockGetAlertas).toHaveBeenCalledWith('test-ies')
})

test('botón Leída llama markAlertaRead', async () => {
  mockGetAlertas.mockResolvedValue({
    alertas: [
      {
        id: 'db1',
        ies_id: 'test-ies',
        carrera_id: 'c1',
        carrera_nombre: 'Medicina',
        tipo: 'd2_bajo' as const,
        severidad: 'media' as const,
        titulo: 'D2 bajo',
        mensaje: null,
        fecha: '2026-04-21T03:00:00',
        leida: false,
      },
    ],
    total: 1,
  })
  mockMarkAlertaRead.mockResolvedValue(undefined)
  render(<AlertasPanel alertas={[]} iesId="test-ies" />)
  fireEvent.click(screen.getByText(/Historial/))
  const btn = await waitFor(() => screen.getByText('✓ Leída'))
  fireEvent.click(btn)
  await waitFor(() => expect(mockMarkAlertaRead).toHaveBeenCalledWith('db1'))
})

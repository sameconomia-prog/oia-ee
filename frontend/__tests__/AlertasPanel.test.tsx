import { render, screen } from '@testing-library/react'
import AlertasPanel from '@/components/AlertasPanel'
import type { AlertaItem } from '@/lib/types'

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
  render(<AlertasPanel alertas={[alertaMock]} />)
  expect(screen.getByText('Derecho')).toBeInTheDocument()
  expect(screen.getByText('alta')).toBeInTheDocument()
  expect(screen.getByText('D1 alto + D2 bajo')).toBeInTheDocument()
})

test('muestra mensaje vacío cuando no hay alertas', () => {
  render(<AlertasPanel alertas={[]} />)
  expect(screen.getByText(/Sin alertas activas/)).toBeInTheDocument()
})

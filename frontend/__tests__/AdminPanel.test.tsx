import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AdminPanel from '@/components/AdminPanel'
import * as api from '@/lib/api'

jest.mock('@/lib/api')

beforeEach(() => {
  jest.mocked(api.postIngestGdelt).mockResolvedValue({
    fetched: 45, stored: 38, classified: 35, embedded: 33,
  })
  localStorage.clear()
})

it('botón dispara POST y muestra resultado', async () => {
  render(<AdminPanel />)
  await userEvent.click(screen.getByRole('button', { name: /Actualizar GDELT/ }))
  await waitFor(() => screen.getByText(/Fetched:/))
  expect(screen.getByText(/Fetched:/)).toBeInTheDocument()
  expect(screen.getByText(/Stored:/)).toBeInTheDocument()
  expect(screen.getByText(/Classified:/)).toBeInTheDocument()
  expect(screen.getByText(/Embedded:/)).toBeInTheDocument()
})

it('guarda resultado en localStorage', async () => {
  render(<AdminPanel />)
  await userEvent.click(screen.getByRole('button', { name: /Actualizar GDELT/ }))
  await waitFor(() => screen.getByText(/Fetched:/))
  const stored = localStorage.getItem('gdelt_history')
  expect(stored).not.toBeNull()
  expect(JSON.parse(stored!)[0].result.fetched).toBe(45)
})

it('muestra error cuando API falla con 401', async () => {
  jest.mocked(api.postIngestGdelt).mockRejectedValue(new Error('HTTP 401'))
  render(<AdminPanel />)
  await userEvent.click(screen.getByRole('button', { name: /Actualizar GDELT/ }))
  await waitFor(() => screen.getByText(/Error: HTTP 401/))
})

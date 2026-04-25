import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AdminPanel from '@/components/AdminPanel'
import * as api from '@/lib/api'

jest.mock('@/lib/api')

beforeEach(() => {
  jest.mocked(api.getAdminIes).mockResolvedValue([])
  jest.mocked(api.postIngestGdelt).mockResolvedValue({
    fetched: 45, stored: 38, classified: 35, embedded: 33,
  })
  localStorage.clear()
})

it('renderiza el panel con botones de acción', async () => {
  await act(async () => { render(<AdminPanel />) })
  expect(screen.getByRole('button', { name: /Ingest GDELT/ })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Seed Demo/ })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Ingest Noticias/ })).toBeInTheDocument()
})

it('botón Ingest GDELT llama a postIngestGdelt', async () => {
  await act(async () => { render(<AdminPanel />) })
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: /Ingest GDELT/ }))
  await waitFor(() => expect(api.postIngestGdelt).toHaveBeenCalled())
})

it('guarda resultado en admin_history de localStorage', async () => {
  await act(async () => { render(<AdminPanel />) })
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: /Ingest GDELT/ }))
  await waitFor(() => {
    const stored = localStorage.getItem('admin_history')
    expect(stored).not.toBeNull()
    const entries = JSON.parse(stored!)
    expect(entries.length).toBeGreaterThan(0)
  })
})

it('muestra error cuando API falla', async () => {
  jest.mocked(api.postIngestGdelt).mockRejectedValue(new Error('HTTP 401'))
  await act(async () => { render(<AdminPanel />) })
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: /Ingest GDELT/ }))
  await waitFor(() => expect(screen.getByText(/HTTP 401/)).toBeInTheDocument())
})

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import NoticiasTable from '@/components/NoticiasTable'
import * as api from '@/lib/api'

jest.mock('@/lib/api')

const mockNoticias = [
  { id: 1, titulo: 'IA en educación', url: 'http://a.com', fuente: 'gdelt',
    contenido: '', fecha_pub: '2024-04-01T00:00:00',
    pais: 'Mexico', sector: 'educacion', tipo_impacto: 'oportunidad' },
  { id: 2, titulo: 'Robots en fábricas', url: 'http://b.com', fuente: 'gdelt',
    contenido: '', fecha_pub: '2024-04-02T00:00:00',
    pais: 'USA', sector: 'tecnologia', tipo_impacto: 'riesgo' },
]

beforeEach(() => {
  jest.mocked(api.getNoticias).mockResolvedValue(mockNoticias)
})

it('renders table rows after loading', async () => {
  render(<NoticiasTable />)
  await waitFor(() => expect(screen.getByText('IA en educación')).toBeInTheDocument())
  expect(screen.getByText('Robots en fábricas')).toBeInTheDocument()
})

it('filters rows by search text', async () => {
  render(<NoticiasTable />)
  await waitFor(() => screen.getByText('IA en educación'))
  await userEvent.type(screen.getByPlaceholderText('Buscar por título...'), 'Robot')
  expect(screen.queryByText('IA en educación')).not.toBeInTheDocument()
  expect(screen.getByText('Robots en fábricas')).toBeInTheDocument()
})

it('disables Anterior button on first page', async () => {
  render(<NoticiasTable />)
  await waitFor(() => screen.getByText('IA en educación'))
  expect(screen.getByText('← Anterior')).toBeDisabled()
})

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import NoticiasTable from '@/components/NoticiasTable'
import * as api from '@/lib/api'

jest.mock('@/lib/api')

const mockNoticias = [
  { id: 'n1', titulo: 'IA en educación', url: 'http://a.com', fuente: 'gdelt',
    fecha_pub: '2024-04-01T00:00:00', fecha_ingesta: '2024-04-01T00:00:00',
    pais: 'Mexico', sector: 'educacion', tipo_impacto: 'oportunidad' },
  { id: 'n2', titulo: 'Robots en fábricas', url: 'http://b.com', fuente: 'gdelt',
    fecha_pub: '2024-04-02T00:00:00', fecha_ingesta: '2024-04-02T00:00:00',
    pais: 'USA', sector: 'tecnologia', tipo_impacto: 'riesgo' },
]

beforeEach(() => {
  jest.mocked(api.getNoticias).mockResolvedValue(mockNoticias)
  jest.mocked(api.buscarNoticias).mockResolvedValue([mockNoticias[0]])
  jest.mocked(api.getSectoresNoticias).mockResolvedValue(['educacion', 'tecnologia'])
})

it('renders table rows after loading', async () => {
  render(<NoticiasTable />)
  await waitFor(() => expect(screen.getByText('IA en educación')).toBeInTheDocument())
  expect(screen.getByText('Robots en fábricas')).toBeInTheDocument()
})

it('llama buscarNoticias al hacer submit del formulario', async () => {
  render(<NoticiasTable />)
  await waitFor(() => screen.getByText('IA en educación'))
  const input = screen.getByPlaceholderText(/Búsqueda semántica/)
  await userEvent.type(input, 'educación')
  await userEvent.keyboard('{Enter}')
  await waitFor(() => expect(api.buscarNoticias).toHaveBeenCalledWith('educación', 20))
})

it('disables Anterior button on first page', async () => {
  render(<NoticiasTable />)
  await waitFor(() => screen.getByText('IA en educación'))
  expect(screen.getByText('← Anterior')).toBeDisabled()
})

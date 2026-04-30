import { render, screen, fireEvent } from '@testing-library/react'
import FormularioContacto from '@/components/landing/FormularioContacto'

describe('FormularioContacto', () => {
  it('muestra los dos tabs IES y Gobierno', () => {
    render(<FormularioContacto />)
    expect(screen.getByRole('button', { name: /Para IES/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Para Gobierno/i })).toBeInTheDocument()
  })

  it('cambia el formulario al cambiar de tab', () => {
    render(<FormularioContacto />)
    expect(screen.getByLabelText(/Institución/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Para Gobierno/i }))
    expect(screen.getByLabelText(/Área de interés/i)).toBeInTheDocument()
  })
})

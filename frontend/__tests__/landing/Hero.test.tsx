import { render, screen } from '@testing-library/react'
import Hero from '@/components/landing/Hero'

describe('Hero', () => {
  it('renderiza el headline con datos', () => {
    render(<Hero totalIes={312} totalCarreras={847} />)
    expect(screen.getByText(/312 IES analizadas/)).toBeInTheDocument()
  })

  it('renderiza los dos CTAs', () => {
    render(<Hero totalIes={312} totalCarreras={847} />)
    expect(screen.getByRole('link', { name: /Descargar Reporte 2026/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Solicitar análisis/i })).toBeInTheDocument()
  })
})

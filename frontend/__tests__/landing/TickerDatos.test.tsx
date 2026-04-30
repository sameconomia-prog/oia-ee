import { render, screen } from '@testing-library/react'
import TickerDatos from '@/components/landing/TickerDatos'

const mockData = {
  total_ies: 312,
  total_carreras: 847,
  total_vacantes: 3247,
  total_noticias: 1840,
  iva_promedio: 0.42,
}

describe('TickerDatos', () => {
  it('renderiza los valores del resumen', () => {
    render(<TickerDatos data={mockData} />)
    expect(screen.getByText(/312/)).toBeInTheDocument()
    expect(screen.getByText(/847/)).toBeInTheDocument()
    // 3247 renders as "3,247" or "3.247" depending on locale
    expect(screen.getByText(/1\.840|1,840|1840/)).toBeInTheDocument()
  })

  it('muestra el IVA promedio nacional', () => {
    render(<TickerDatos data={mockData} />)
    expect(screen.getByText(/0\.42/)).toBeInTheDocument()
  })
})

import { render, screen, fireEvent } from '@testing-library/react'
import LeadMagnetModal from '@/components/landing/LeadMagnetModal'

describe('LeadMagnetModal', () => {
  it('no renderiza nada cuando isOpen es false', () => {
    const { container } = render(
      <LeadMagnetModal isOpen={false} onClose={() => {}} pdfUrl="/test.pdf" titulo="Test" />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renderiza el formulario cuando isOpen es true', () => {
    render(
      <LeadMagnetModal isOpen={true} onClose={() => {}} pdfUrl="/test.pdf" titulo="Reporte Test" />
    )
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Descargar/i })).toBeInTheDocument()
  })

  it('llama onClose al hacer clic en el botón cerrar', () => {
    const onClose = jest.fn()
    render(
      <LeadMagnetModal isOpen={true} onClose={onClose} pdfUrl="/test.pdf" titulo="Test" />
    )
    fireEvent.click(screen.getByRole('button', { name: /cerrar/i }))
    expect(onClose).toHaveBeenCalled()
  })
})

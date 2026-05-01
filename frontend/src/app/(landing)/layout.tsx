import Navbar from '@/components/landing/Navbar'
import Footer from '@/components/landing/Footer'
import GSAPProvider from '@/components/landing/providers/GSAPProvider'
import LenisProvider from '@/components/landing/providers/LenisProvider'
import NoiseOverlay from '@/components/landing/ui/NoiseOverlay'
import CustomCursor from '@/components/landing/ui/CustomCursor'
import PageLoader from '@/components/landing/ui/PageLoader'

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="landing-theme"
      style={{ background: 'var(--l-bg-0)', color: 'var(--l-text-primary)', minHeight: '100vh' }}
    >
      <GSAPProvider>
        <LenisProvider>
          <PageLoader />
          <NoiseOverlay />
          <CustomCursor />
          <Navbar />
          {children}
          <Footer />
        </LenisProvider>
      </GSAPProvider>
    </div>
  )
}

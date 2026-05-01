'use client'

import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'

export default function PageLoader() {
  const [visible, setVisible] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const alreadyVisited = sessionStorage.getItem('oia-visited')
    if (alreadyVisited) return

    setVisible(true)

    const minDelay = new Promise<void>(resolve => setTimeout(resolve, 1500))
    const domReady = new Promise<void>(resolve => {
      if (document.readyState === 'complete') resolve()
      else window.addEventListener('load', () => resolve(), { once: true })
    })

    Promise.all([minDelay, domReady]).then(() => {
      sessionStorage.setItem('oia-visited', '1')
      if (!overlayRef.current) return
      gsap.to(overlayRef.current, {
        opacity: 0,
        duration: 0.6,
        ease: 'power2.inOut',
        onComplete: () => setVisible(false),
      })
    })
  }, [])

  if (!visible) return null

  return (
    <div
      ref={overlayRef}
      style={{
        position: 'fixed',
        inset: 0,
        background: '#08090a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        gap: '1.5rem',
      }}
    >
      {/* Logo OIA-EE — pulse */}
      <div
        style={{
          fontFamily: 'var(--font-syne, sans-serif)',
          fontSize: '2rem',
          fontWeight: 700,
          color: '#f7f8f8',
          letterSpacing: '-0.03em',
          animation: 'oiaPulse 1.4s ease-in-out infinite',
        }}
      >
        OIA<span style={{ color: '#3B82F6' }}>—</span>EE
      </div>
      <p
        style={{
          fontFamily: 'var(--font-outfit, sans-serif)',
          fontSize: '0.8rem',
          color: '#62748e',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
      >
        Cargando datos...
      </p>
      <style>{`
        @keyframes oiaPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}

'use client'

import { useEffect } from 'react'
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export default function LenisProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const isDesktop = window.matchMedia('(min-width: 1024px)').matches
    if (!isDesktop) return

    const lenis = new Lenis({ lerp: 0.08, syncTouch: false })
    lenis.on('scroll', ScrollTrigger.update)

    const ticker = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(ticker)
    gsap.ticker.lagSmoothing(0)

    return () => {
      gsap.ticker.remove(ticker)
      lenis.destroy()
    }
  }, [])

  return <>{children}</>
}

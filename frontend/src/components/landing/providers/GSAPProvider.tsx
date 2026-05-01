'use client'

import { useEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { CustomEase } from 'gsap/CustomEase'

export default function GSAPProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase)

    CustomEase.create('cinematicSilk',   '0.45,0.05,0.55,0.95')
    CustomEase.create('cinematicSmooth', '0.25,0.1,0.25,1')
    CustomEase.create('cinematicFlow',   '0.33,0,0.2,1')

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) {
      gsap.defaults({ duration: 0.01 })
      ScrollTrigger.getAll().forEach(t => t.kill())
    }

    return () => {
      ScrollTrigger.getAll().forEach(t => t.kill())
    }
  }, [])

  return <>{children}</>
}

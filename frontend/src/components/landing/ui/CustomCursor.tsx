'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

const TRAIL_COUNT = 5

export default function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null)
  const trailRefs = useRef<HTMLDivElement[]>([])
  const mouse = useRef({ x: 0, y: 0 })
  const isVisible = useRef(false)

  useEffect(() => {
    const isTouch = 'ontouchstart' in window || window.innerWidth < 1024
    if (isTouch) return

    const cursor = cursorRef.current
    if (!cursor) return

    const onMove = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY }

      if (!isVisible.current) {
        isVisible.current = true
        gsap.to(cursor, { opacity: 1, duration: 0.3 })
        trailRefs.current.forEach(t => gsap.to(t, { opacity: 0.3, duration: 0.3 }))
      }

      gsap.to(cursor, {
        x: e.clientX - 6,
        y: e.clientY - 6,
        duration: 0.15,
        ease: 'power2.out',
      })

      trailRefs.current.forEach((dot, i) => {
        gsap.to(dot, {
          x: e.clientX - 3,
          y: e.clientY - 3,
          duration: 0.15 + i * 0.04,
          ease: 'power2.out',
          delay: i * 0.02,
        })
      })
    }

    const onEnterHoverable = () => {
      gsap.to(cursor, { width: 40, height: 40, x: '-=14', y: '-=14', duration: 0.25, ease: 'power2.out' })
    }

    const onLeaveHoverable = () => {
      gsap.to(cursor, { width: 12, height: 12, x: '+=14', y: '+=14', duration: 0.25, ease: 'power2.out' })
    }

    const attachHoverListeners = () => {
      document.querySelectorAll('a, button, [data-cursor-hover]').forEach(el => {
        el.addEventListener('mouseenter', onEnterHoverable)
        el.addEventListener('mouseleave', onLeaveHoverable)
      })
    }

    document.addEventListener('mousemove', onMove)
    attachHoverListeners()

    return () => {
      document.removeEventListener('mousemove', onMove)
    }
  }, [])

  return (
    <>
      <div
        ref={cursorRef}
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: 'white',
          mixBlendMode: 'difference',
          pointerEvents: 'none',
          zIndex: 99999,
          opacity: 0,
          transform: 'translate(-100px, -100px)',
        }}
      />
      {Array.from({ length: TRAIL_COUNT }).map((_, i) => (
        <div
          key={i}
          ref={el => { if (el) trailRefs.current[i] = el }}
          aria-hidden="true"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'white',
            mixBlendMode: 'difference',
            pointerEvents: 'none',
            zIndex: 99998,
            opacity: 0,
            transform: 'translate(-100px, -100px)',
          }}
        />
      ))}
    </>
  )
}

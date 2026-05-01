'use client'

import { useEffect, useRef } from 'react'

function generateNoiseDataURL(size = 256): string {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const imageData = ctx.createImageData(size, size)
  for (let i = 0; i < imageData.data.length; i += 4) {
    const value = Math.random() * 255
    imageData.data[i]     = value
    imageData.data[i + 1] = value
    imageData.data[i + 2] = value
    imageData.data[i + 3] = 255
  }
  ctx.putImageData(imageData, 0, 0)
  return canvas.toDataURL('image/png')
}

export default function NoiseOverlay() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    const dataURL = generateNoiseDataURL(256)
    ref.current.style.backgroundImage = `url(${dataURL})`
  }, [])

  return (
    <div
      ref={ref}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundRepeat: 'repeat',
        backgroundSize: '256px 256px',
        opacity: 0.015,
        mixBlendMode: 'overlay',
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    />
  )
}

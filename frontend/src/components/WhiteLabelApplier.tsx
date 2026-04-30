'use client'
import { useEffect } from 'react'
import { fetchWhiteLabel, applyWhiteLabel } from '@/lib/whitelabel'

export default function WhiteLabelApplier() {
  useEffect(() => {
    fetchWhiteLabel().then(applyWhiteLabel)
  }, [])
  return null
}

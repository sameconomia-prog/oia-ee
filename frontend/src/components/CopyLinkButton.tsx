'use client'
import { useState } from 'react'

export default function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(url).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        })
      }}
      className="text-xs text-slate-500 border border-slate-200 px-3 py-1.5 rounded hover:bg-slate-50 transition-colors font-medium"
    >
      {copied ? '✓ Copiado' : 'Copiar enlace'}
    </button>
  )
}

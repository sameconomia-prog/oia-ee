import { cobertura, type CoberturaItem } from '@/content/cobertura'

interface CoberturaPrensaProps {
  enabled?: boolean
}

function CoberturaCard({ item }: { item: CoberturaItem }) {
  if (item.tipo === 'logo' && item.logo_url) {
    return (
      <div className="flex items-center justify-center p-4 bg-white rounded-lg border border-gray-100 shadow-sm h-16">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.logo_url} alt={item.fuente} className="max-h-8 object-contain grayscale opacity-60" />
      </div>
    )
  }
  return (
    <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4">
      {item.texto && <p className="text-sm text-gray-700 italic">"{item.texto}"</p>}
      <p className="text-xs text-gray-400 mt-2">— {item.fuente}</p>
    </div>
  )
}

export default function CoberturaPrensa({ enabled = false }: CoberturaPrensaProps) {
  if (!enabled || cobertura.length === 0) return null

  return (
    <section className="py-8 bg-gray-50 border-y border-gray-100">
      <div className="max-w-7xl mx-auto px-4">
        <p className="text-center text-xs text-gray-400 uppercase tracking-widest mb-6">
          Como se ha mencionado en
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {cobertura.map((item, i) => (
            <CoberturaCard key={i} item={item} />
          ))}
        </div>
      </div>
    </section>
  )
}

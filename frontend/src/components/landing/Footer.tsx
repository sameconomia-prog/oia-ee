import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 py-14 px-4">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Brand */}
        <div className="md:col-span-1">
          <p className="font-bold text-white text-lg mb-2">OIA-EE</p>
          <p className="text-sm text-gray-400 leading-relaxed">
            Datos para decisiones que no pueden esperar.
          </p>
          <div className="flex gap-4 mt-4">
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors text-sm">LinkedIn</a>
            <a href="https://github.com/sameconomia-prog/oia-ee" target="_blank" rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors text-sm">GitHub</a>
          </div>
        </div>

        {/* Observatorio */}
        <div>
          <p className="text-white font-semibold mb-3 text-sm">Observatorio</p>
          <ul className="space-y-2 text-sm">
            <li><Link href="/investigaciones" className="hover:text-white transition-colors">Investigaciones</Link></li>
            <li><Link href="/benchmarks" className="hover:text-white transition-colors">Benchmarks globales</Link></li>
            <li><Link href="/estadisticas" className="hover:text-white transition-colors">Estadísticas</Link></li>
            <li><Link href="/metodologia" className="hover:text-white transition-colors">Metodología</Link></li>
            <li><Link href="/#contacto" className="hover:text-white transition-colors">Contacto</Link></li>
          </ul>
        </div>

        {/* Para Instituciones */}
        <div>
          <p className="text-white font-semibold mb-3 text-sm">Para Instituciones</p>
          <ul className="space-y-2 text-sm">
            <li><Link href="/guia" className="hover:text-white transition-colors">Guía de uso</Link></li>
            <li><Link href="/ies" className="hover:text-white transition-colors">Instituciones (IES)</Link></li>
            <li><Link href="/carreras" className="hover:text-white transition-colors">Carreras</Link></li>
            <li><Link href="/pertinencia" className="hover:text-white transition-colors">Análisis de pertinencia</Link></li>
            <li><Link href="/comparar" className="hover:text-white transition-colors">Comparar IES</Link></li>
          </ul>
        </div>

        {/* Legal */}
        <div>
          <p className="text-white font-semibold mb-3 text-sm">Legal</p>
          <ul className="space-y-2 text-sm">
            <li><span className="text-gray-500 cursor-not-allowed">Aviso de privacidad</span></li>
            <li><span className="text-gray-500 cursor-not-allowed">Términos de uso</span></li>
          </ul>
        </div>
      </div>

      <div className="max-w-6xl mx-auto mt-10 pt-6 border-t border-gray-800 text-center text-xs text-gray-500">
        © 2026 OIA-EE · México
      </div>
    </footer>
  )
}

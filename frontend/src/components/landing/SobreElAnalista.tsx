export default function SobreElAnalista() {
  return (
    <section className="py-20 px-4 bg-[#F8FAFC]">
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 items-center">
          <div className="flex justify-center">
            <div className="w-40 h-40 rounded-full bg-gray-200 border-4 border-white shadow-md flex items-center justify-center text-gray-400 text-5xl">
              👤
            </div>
          </div>
          <div className="md:col-span-2">
            <p className="text-[#1D4ED8] font-semibold text-sm uppercase tracking-wide mb-2">
              Sobre el analista
            </p>
            <p className="text-gray-800 text-lg leading-relaxed mb-4">
              Arturo Aguilar es economista especializado en mercados laborales e impacto
              tecnológico. Candidato a Doctor, ha trabajado con instituciones educativas en
              México analizando brechas entre formación profesional y demanda del mercado.
              OIA-EE nació de la observación de que las IES toman decisiones curriculares sin
              datos en tiempo real sobre hacia dónde se mueve el empleo.
            </p>
            <div className="flex gap-4">
              <a
                href="https://linkedin.com/in/arturoaguilar"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#1D4ED8] text-sm font-medium hover:underline"
              >
                LinkedIn →
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

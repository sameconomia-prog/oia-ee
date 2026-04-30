import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Términos de Servicio — OIA-EE',
  description: 'Términos y condiciones de uso de la plataforma OIA-EE para instituciones educativas mexicanas.',
}

const FECHA = '30 de abril de 2026'

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-slate-100 px-6 py-4 flex items-center justify-between max-w-4xl mx-auto">
        <Link href="/demo" className="font-bold text-indigo-700 text-lg">OIA-EE</Link>
        <div className="flex gap-4 text-sm">
          <Link href="/privacidad" className="text-slate-600 hover:text-indigo-700">Aviso de privacidad</Link>
          <Link href="/demo" className="text-slate-600 hover:text-indigo-700">Producto</Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Términos de Servicio</h1>
        <p className="text-sm text-slate-500 mb-10">Última actualización: {FECHA}</p>

        <div className="text-sm leading-7 space-y-8 text-slate-700">

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-3">1. Aceptación de los términos</h2>
            <p>
              Al acceder o utilizar la plataforma OIA-EE (en adelante "la Plataforma"), la institución o persona que contrata el servicio
              (en adelante "el Cliente") acepta quedar obligada por estos Términos de Servicio y por el{' '}
              <Link href="/privacidad" className="text-indigo-600 hover:underline">Aviso de Privacidad</Link>{' '}
              de OIA-EE. Si el Cliente no acepta estos términos, debe abstenerse de usar la Plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-3">2. Descripción del servicio</h2>
            <p>
              OIA-EE es una plataforma SaaS (Software as a Service) que provee indicadores estratégicos (KPIs D1–D7) sobre el impacto de
              la inteligencia artificial en carreras universitarias mexicanas, incluyendo análisis de obsolescencia, oportunidades laborales,
              mercado de trabajo, perfil estudiantil, motor predictivo, radar de noticias IA y generación de reportes ejecutivos.
            </p>
            <p className="mt-3">
              Los datos utilizados provienen de fuentes públicas oficiales (IMSS, INEGI ENOE, ANUIES, SEP) y de mercado laboral abierto
              (OCC México). OIA-EE no garantiza que dichas fuentes sean exhaustivas ni libres de errores, y los indicadores deben
              interpretarse como herramientas de apoyo a la decisión, no como verdades absolutas.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-3">3. Planes y facturación</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse mt-2">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Plan</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Precio</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Facturación</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Starter', '$180,000 MXN', 'Anual anticipado'],
                    ['Pro', '$420,000 MXN', 'Anual anticipado'],
                    ['Enterprise', 'Desde $850,000 MXN', 'Anual anticipado, previa negociación'],
                    ['Pertinencia Ad-hoc', '$120,000 MXN por estudio', 'Por evento'],
                  ].map(([plan, precio, fact], i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="px-3 py-2 border-t border-slate-100 font-medium">{plan}</td>
                      <td className="px-3 py-2 border-t border-slate-100">{precio}</td>
                      <td className="px-3 py-2 border-t border-slate-100">{fact}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3">
              Los precios no incluyen IVA. OIA-EE emitirá CFDI por el monto contratado una vez constituida la figura legal correspondiente.
              El acceso a la Plataforma se activa al confirmarse el pago. No se realizan devoluciones parciales una vez iniciado el período de servicio,
              salvo falla técnica imputable a OIA-EE que impida el acceso por más de 72 horas consecutivas.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-3">4. Uso permitido</h2>
            <p>El Cliente se compromete a:</p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>Utilizar la Plataforma exclusivamente para fines de planeación institucional interna.</li>
              <li>No compartir credenciales de acceso con personas fuera de la institución contratante.</li>
              <li>No reproducir, distribuir ni comercializar los reportes generados sin autorización expresa de OIA-EE.</li>
              <li>No intentar acceder a datos de otras instituciones o realizar scraping de la API.</li>
              <li>No utilizar la Plataforma para actividades que infrinjan leyes aplicables en México.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-3">5. Propiedad intelectual</h2>
            <p>
              La metodología OIA-EE, los algoritmos de cálculo de KPIs D1–D7, el motor predictivo, el software y los diseños de la Plataforma
              son propiedad exclusiva de OIA-EE y están protegidos por la <em>Ley Federal del Derecho de Autor</em> y demás legislación
              aplicable. El Cliente recibe una licencia de uso no exclusiva, no transferible y limitada al período contratado.
            </p>
            <p className="mt-3">
              Los datos públicos que alimentan la Plataforma (IMSS, INEGI, ANUIES, SEP, OCC) pertenecen a sus respectivas fuentes y
              se utilizan bajo sus licencias de datos abiertos.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-3">6. Limitación de responsabilidad</h2>
            <p>
              OIA-EE provee la Plataforma "tal como está" (<em>as is</em>). En ningún caso OIA-EE será responsable por decisiones
              institucionales tomadas con base en los indicadores de la Plataforma, pérdidas de matrícula, sanciones de acreditadoras,
              ni daños indirectos, incidentales o consecuentes.
            </p>
            <p className="mt-3">
              La responsabilidad máxima de OIA-EE en cualquier reclamación no excederá el monto pagado por el Cliente en los
              12 meses anteriores al evento que dio origen a la reclamación.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-3">7. Nivel de servicio (SLA)</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse mt-2">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Plan</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Disponibilidad mensual</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Tiempo de respuesta soporte</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Starter', '99.0%', '48 horas hábiles'],
                    ['Pro', '99.5%', '24 horas hábiles'],
                    ['Enterprise', '99.9%', '4 horas hábiles'],
                  ].map(([plan, disp, resp], i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="px-3 py-2 border-t border-slate-100 font-medium">{plan}</td>
                      <td className="px-3 py-2 border-t border-slate-100">{disp}</td>
                      <td className="px-3 py-2 border-t border-slate-100">{resp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3">
              El mantenimiento programado (máximo 4 horas mensuales, notificado con 48h de anticipación) no computa como tiempo de inactividad.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-3">8. Confidencialidad</h2>
            <p>
              Ambas partes se obligan a mantener confidencialidad sobre la información del negocio, metodología y datos institucionales
              intercambiados durante la relación contractual. Esta obligación permanece vigente durante 3 años posteriores a la terminación
              del contrato.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-3">9. Terminación</h2>
            <p>
              OIA-EE podrá suspender o cancelar el acceso sin previo aviso en caso de uso prohibido, impago, o violación de estos Términos.
              El Cliente puede cancelar el servicio con 30 días de anticipación al vencimiento del período anual, sin penalización,
              mediante notificación por escrito a{' '}
              <a href="mailto:sam.economia@gmail.com" className="text-indigo-600 hover:underline">sam.economia@gmail.com</a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-3">10. Legislación aplicable y jurisdicción</h2>
            <p>
              Estos Términos se rigen por las leyes de los <strong>Estados Unidos Mexicanos</strong>.
              Para cualquier controversia derivada de la interpretación o cumplimiento de estos Términos, las partes se someten a la
              jurisdicción de los Tribunales competentes de la <strong>Ciudad de México</strong>, renunciando a cualquier otro fuero
              que pudiera corresponderles en razón de sus domicilios presentes o futuros.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-3">11. Modificaciones</h2>
            <p>
              OIA-EE se reserva el derecho de modificar estos Términos. Los cambios serán notificados por correo electrónico con al menos
              15 días de anticipación. El uso continuado de la Plataforma después de la fecha de entrada en vigor implicará la aceptación
              de los Términos modificados.
            </p>
          </section>

          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 mt-8">
            <p className="text-sm text-indigo-800">
              <strong>Preguntas sobre estos términos:</strong>{' '}
              <a href="mailto:sam.economia@gmail.com" className="underline">sam.economia@gmail.com</a>
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-100 py-6 px-6 text-center text-xs text-slate-400 mt-8">
        <p>© {new Date().getFullYear()} OIA-EE — Observatorio de Impacto IA en Educación y Empleo</p>
        <p className="mt-1">
          <Link href="/privacidad" className="hover:text-indigo-700">Aviso de privacidad</Link>
          {' · '}
          <Link href="/demo" className="hover:text-indigo-700">Producto</Link>
        </p>
      </footer>
    </div>
  )
}

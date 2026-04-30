import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Aviso de Privacidad — OIA-EE',
  description: 'Aviso de privacidad integral de OIA-EE conforme a la LFPDPPP y lineamientos del INAI.',
}

const FECHA = '30 de abril de 2026'

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-slate-100 px-6 py-4 flex items-center justify-between max-w-4xl mx-auto">
        <Link href="/demo" className="font-bold text-indigo-700 text-lg">OIA-EE</Link>
        <div className="flex gap-4 text-sm">
          <Link href="/terminos" className="text-slate-600 hover:text-indigo-700">Términos de servicio</Link>
          <Link href="/demo" className="text-slate-600 hover:text-indigo-700">Producto</Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Aviso de Privacidad Integral</h1>
        <p className="text-sm text-slate-500 mb-10">Última actualización: {FECHA}</p>

        <div className="prose prose-slate max-w-none text-sm leading-7 space-y-8">

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-3">I. Identidad y domicilio del Responsable</h2>
            <p>
              <strong>OIA-EE — Observatorio de Impacto IA en Educación y Empleo</strong> (en adelante "OIA-EE" o el "Responsable"),
              con domicilio en la Ciudad de México, México, y correo de contacto{' '}
              <a href="mailto:privacidad@oia-ee.mx" className="text-indigo-600 hover:underline">privacidad@oia-ee.mx</a>,
              es responsable del tratamiento de los datos personales que recabe a través de la plataforma oia-ee.com y sus subdominios,
              conforme a lo establecido en la <em>Ley Federal de Protección de Datos Personales en Posesión de los Particulares</em>{' '}
              (LFPDPPP) y su Reglamento.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-3">II. Datos personales que recabamos</h2>
            <p>OIA-EE podrá recabar las siguientes categorías de datos personales:</p>
            <ul className="list-disc list-inside space-y-1 mt-2 text-slate-700">
              <li><strong>Datos de identificación y contacto:</strong> nombre completo, correo electrónico institucional, cargo, nombre de la institución.</li>
              <li><strong>Datos de acceso a la plataforma:</strong> nombre de usuario, contraseña (almacenada en formato hash bcrypt), dirección IP, agente de navegador, fecha y hora de acceso.</li>
              <li><strong>Datos de uso:</strong> páginas visitadas, reportes generados, configuraciones de la cuenta, historial de alertas consultadas.</li>
              <li><strong>Datos para estudios de pertinencia:</strong> nombre del contacto, correo, nombre de institución educativa y programa académico solicitado (no se recaban datos de alumnos).</li>
            </ul>
            <p className="mt-3">
              <strong>No recabamos datos sensibles</strong> en los términos del artículo 3, fracción VI de la LFPDPPP.
              No recabamos datos personales de menores de edad.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-3">III. Finalidades del tratamiento</h2>
            <h3 className="font-semibold text-slate-700 mt-3 mb-1">Finalidades primarias (necesarias para la relación contractual):</h3>
            <ul className="list-disc list-inside space-y-1 text-slate-700">
              <li>Brindar acceso autenticado a la plataforma OIA-EE y sus funcionalidades.</li>
              <li>Generar y enviar reportes ejecutivos, alertas y resúmenes semanales solicitados.</li>
              <li>Atender solicitudes de estudios de pertinencia ad-hoc.</li>
              <li>Facturación y gestión del contrato de servicio SaaS.</li>
              <li>Soporte técnico y atención a incidencias.</li>
            </ul>
            <h3 className="font-semibold text-slate-700 mt-3 mb-1">Finalidades secundarias (puede oponerse):</h3>
            <ul className="list-disc list-inside space-y-1 text-slate-700">
              <li>Envío de comunicaciones sobre nuevas funcionalidades, actualizaciones de metodología y eventos del sector.</li>
              <li>Elaboración de estadísticas agregadas y anónimas sobre el uso de la plataforma para mejora del servicio.</li>
            </ul>
            <p className="mt-3 text-slate-600">
              Si desea que sus datos no sean tratados para las finalidades secundarias, puede manifestar su negativa enviando un correo a{' '}
              <a href="mailto:privacidad@oia-ee.mx" className="text-indigo-600 hover:underline">privacidad@oia-ee.mx</a> con el asunto
              "Oposición a finalidades secundarias".
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-3">IV. Transferencias de datos</h2>
            <p>OIA-EE podrá transferir sus datos a los siguientes terceros sin requerir su consentimiento (artículo 37 LFPDPPP):</p>
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Destinatario</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Finalidad</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">País</th>
                  </tr>
                </thead>
                <tbody className="text-slate-600">
                  {[
                    ['Railway Technologies Inc.', 'Hospedaje de infraestructura API y base de datos', 'EUA'],
                    ['Vercel Inc.', 'Hospedaje del frontend de la plataforma', 'EUA'],
                    ['Resend Inc.', 'Envío de correos electrónicos transaccionales y de reporte', 'EUA'],
                    ['Anthropic PBC / Groq Inc.', 'Clasificación y análisis de noticias mediante IA (datos anónimos)', 'EUA'],
                  ].map(([dest, fin, pais], i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="px-3 py-2 border-t border-slate-100 font-medium">{dest}</td>
                      <td className="px-3 py-2 border-t border-slate-100">{fin}</td>
                      <td className="px-3 py-2 border-t border-slate-100">{pais}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-slate-600">
              Todos los proveedores indicados cuentan con mecanismos de protección equivalentes o superiores a los requeridos por la LFPDPPP.
              No se realizan transferencias con fines comerciales a terceros no relacionados con la operación del servicio.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-3">V. Derechos ARCO y revocación del consentimiento</h2>
            <p>
              Usted tiene derecho a <strong>Acceder, Rectificar, Cancelar u Oponerse</strong> (derechos ARCO) al tratamiento de sus datos personales,
              así como a revocar el consentimiento otorgado, enviando solicitud a{' '}
              <a href="mailto:privacidad@oia-ee.mx" className="text-indigo-600 hover:underline">privacidad@oia-ee.mx</a> con:
            </p>
            <ul className="list-disc list-inside space-y-1 mt-2 text-slate-700">
              <li>Nombre completo y correo institucional registrado.</li>
              <li>Descripción clara del derecho que desea ejercer y los datos involucrados.</li>
              <li>Identificación oficial (IFE/INE, pasaporte o cédula profesional) en formato digital.</li>
            </ul>
            <p className="mt-3 text-slate-600">
              Daremos respuesta en un plazo máximo de <strong>20 días hábiles</strong> contados desde la recepción de la solicitud completa.
              En caso de ser procedente, el cambio se hará efectivo en los siguientes 15 días hábiles.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-3">VI. Uso de cookies y tecnologías de rastreo</h2>
            <p>
              OIA-EE utiliza <strong>cookies de sesión</strong> estrictamente necesarias para el funcionamiento de la autenticación (JWT almacenado en localStorage).
              No utilizamos cookies de terceros para publicidad ni rastreo comportamental. No utilizamos píxeles de seguimiento.
            </p>
            <p className="mt-2 text-slate-600">
              Los datos de uso se procesan de forma agregada y anónima únicamente para mejorar la experiencia de la plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-3">VII. Medidas de seguridad</h2>
            <p>
              OIA-EE implementa medidas de seguridad administrativas, técnicas y físicas para proteger sus datos:
              cifrado en tránsito (TLS 1.3), contraseñas almacenadas con bcrypt (cost 12), tokens JWT con expiración de 15 minutos,
              refresh tokens revocables, y acceso a datos de producción restringido por rol (RBAC con 4 niveles).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-3">VIII. Cambios al aviso de privacidad</h2>
            <p>
              OIA-EE se reserva el derecho de modificar este aviso. Cualquier cambio será notificado por correo electrónico a los usuarios registrados
              y publicado en esta página con al menos 15 días de anticipación a su entrada en vigor.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-3">IX. Autoridad</h2>
            <p>
              Si considera que su derecho a la protección de datos personales ha sido vulnerado, puede acudir al{' '}
              <strong>Instituto Nacional de Transparencia, Acceso a la Información y Protección de Datos Personales (INAI)</strong>{' '}
              en <a href="https://www.inai.org.mx" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">www.inai.org.mx</a>.
            </p>
          </section>

          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 mt-8">
            <p className="text-sm text-indigo-800">
              <strong>Contacto de privacidad:</strong>{' '}
              <a href="mailto:privacidad@oia-ee.mx" className="underline">privacidad@oia-ee.mx</a>{' '}
              · También puede escribir a{' '}
              <a href="mailto:sam.economia@gmail.com" className="underline">sam.economia@gmail.com</a>
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-100 py-6 px-6 text-center text-xs text-slate-400 mt-8">
        <p>© {new Date().getFullYear()} OIA-EE — Observatorio de Impacto IA en Educación y Empleo</p>
        <p className="mt-1">
          <Link href="/terminos" className="hover:text-indigo-700">Términos de servicio</Link>
          {' · '}
          <Link href="/demo" className="hover:text-indigo-700">Producto</Link>
        </p>
      </footer>
    </div>
  )
}

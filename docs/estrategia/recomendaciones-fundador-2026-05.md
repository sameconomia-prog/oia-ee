# OIA-EE — 5 Recomendaciones Estratégicas para el Fundador
**Fecha:** 2026-05-08
**Para:** Arturo Aguilar (fundador, solopreneur)
**De:** Estratega senior SaaS B2B / EdTech
**Contexto:** Pre-cliente #1, producto en producción, decisiones de go-to-market y estructura.

---

## Decisión 1 — Pricing del Estudio de Pertinencia

**Contexto en una línea:** Tienes una contradicción operativa visible en menos de 5 minutos de navegación: cobras $120k MXN como add-on en `/planes` y declaras "completamente gratuito" en `/pertinencia`. Eso destruye credibilidad de pricing antes de la primera llamada.

**Recomendación:** **Opción C — Híbrido.** Diagnóstico Express gratis (3 carreras, 4 páginas, generado automáticamente desde el formulario público). Estudio de Pertinencia Profundo $120k MXN (17 carreras, 11 páginas, sesión de presentación con el rector, incluido sin costo dentro de Pro y Enterprise).

**Razón principal:** Esto es exactamente el playbook de **HubSpot con su Website Grader** y de **Stripe con Atlas**: el activo gratuito es deliberadamente acotado para que duela su limitación, no para sustituir el producto. Tres carreras es suficiente para que un rector vea la calidad del motor predictivo, insuficiente para que tome decisiones de portafolio académico (que es lo que necesita). El estudio profundo a $120k cumple dos funciones simultáneas: producto puerta para rectores que no quieren suscripción anual, y anchor pricing que hace que Pro a $35k/mes ($420k/año) parezca obvio ("por 3.5x el precio de un estudio único, tienes el observatorio vivo todo el año"). Eliminar uno u otro destruye una de las dos palancas.

**Trade-off honesto:** Pierdes la simplicidad narrativa de un solo mensaje ("es gratis" o "cuesta X"). Vas a tener que defender la lógica del corte en 3 vs 17 carreras en cada llamada, y un porcentaje de prospectos se quedará con el gratuito sin convertir nunca — acepta que ese ~70% es tu canal de evangelización, no leads cualificados.

**Indicador de éxito (6 meses):** Conversión Diagnóstico Express → llamada agendada ≥ 8%, y al menos 2 clientes cerraron Estudio Profundo $120k como puerta de entrada antes de Pro.

**Acción inmediata (48h):** Reescribir copy de `/pertinencia` con el nuevo split y publicar bajo el botón "Diagnóstico Express gratuito" un disclaimer pequeño: "Versión completa de 17 carreras disponible como Estudio de Pertinencia ($120k MXN) o incluida en planes Pro y Enterprise."

---

## Decisión 2 — Tier Piloto $60-80k MXN

**Contexto en una línea:** El cuello de botella en venta a IES no es el precio absoluto, es la asimetría de información — un rector no compra $1.2M sin haber visto el producto operando contra SUS datos.

**Recomendación:** **Opción D — Free trial 30 días Pro completo, sin tier nuevo.** Acceso total al producto Pro contra los datos reales de la IES, con sesión de onboarding incluida. Vencido el trial, conversión a Pro anual o Enterprise.

**Razón principal:** Esto es **Linear y Vercel**, no Notion. Linear sostiene 4 tiers porque tiene equipo de pricing y revenue ops; tú eres un solopreneur con 471 tests que mantener. Cada tier adicional es ~5h/mes de soporte fragmentado, copy en landing, lógica de gating en multi-tenancy y conversaciones del tipo "¿cuál me conviene?". Un trial de 30 días de Pro elimina la asimetría de información SIN crear SKU permanente. Además, en el ciclo IES (3-6 meses para director, 6-12 para rector), 30 días son suficientes para que el director académico se enamore y vaya a vender internamente. El tier piloto a $60k generaría un anti-patrón: rectores firmando piloto para "probar barato" y nunca convirtiendo, porque psicológicamente ya pagaron y eso liquida la urgencia.

**Trade-off honesto:** Vas a regalar ~$200k MXN equivalentes en producto a prospectos que no convertirán. Y vas a tener que invertir 2-3h por trial en onboarding personalizado para que no se desperdicie — eso no escala más allá de ~5 trials simultáneos hasta que tengas CSM.

**Indicador de éxito (6 meses):** ≥ 30% de trials terminados convierten a Pro o Enterprise dentro de 60 días post-trial.

**Acción inmediata (48h):** No tocar `/planes`. Crear flag `trial_expires_at` en multi-tenancy y un único formulario interno "Solicitar trial 30 días" enlazado solo desde llamadas de venta, no desde landing público (preserva el anchor de Pro).

---

## Decisión 3 — Contractor antes del cliente #3

**Contexto en una línea:** Como solopreneur académico-técnico tu cuello de botella real no es soporte ni delivery, es la generación continua de contenido que sostiene tu autoridad — el activo que diferencia a OIA-EE de Hanover.

**Recomendación:** **Opción D — Investigador/escritor part-time** (no CSM, no VA, no consultora). Perfil: maestrante en economía o políticas educativas, 15-20h/semana, $18-25k MXN/mes, output: 2 artículos MDX semanales + investigación de 1 pillar LinkedIn semanal.

**Razón principal:** El moat de OIA-EE no es el código (replicable en 6 meses por cualquier equipo competente con FastAPI y statsforecast); es el corpus de 78 artículos + 88 skills × 17 carreras + tu reputación como economista que entiende IES. Eso es lo que **HolonIQ y a16z hicieron en sus respectivos sectores**: contrataron analistas/investigadores ANTES que vendedores, porque el inbound lo genera el contenido y el contenido es lo que un fundador no debería externalizar tarde. El CSM es premature optimization — con 1-2 clientes Enterprise puedes hacer customer success tú mismo en 6h/semana, y eso te mantiene cerca del cliente para iterar producto. La consultora subcontratada destruye margen y calidad. El VA administrativo no resuelve el bloqueador real (eres solopreneur, no tienes admin que externalizar todavía).

**Trade-off honesto:** $20k/mes son 5 meses sin colchón — vas a sentir el costo antes del MRR positivo. Y tendrás que invertir 4-6h/semana en revisar drafts, lo que no es trivial cuando ya estás haciendo ventas.

**Indicador de éxito (6 meses):** Pipeline de 12+ artículos MDX/mes sostenido, y al menos 1 lead Enterprise atribuido a contenido del investigador.

**Acción inmediata (48h):** Postear vacante en LinkedIn y en el grupo de exalumnos de tu maestría/doctorado — busca alguien con tesis en economía de la educación o políticas públicas educativas.

**Orden de prioridad recomendado para los 5 perfiles:** D (investigador) → A (CSM, después del cliente #5) → C (VA, después del cliente #8) → E (consultora, solo si superas capacidad de delivery) → B (esperar a #10, descartado).

---

## Decisión 4 — Framework para Junta Asesora académica

**Contexto en una línea:** La Junta Asesora no es decoración — es señal de credibilidad metodológica que un comité académico de IES revisa antes de firmar contrato.

**Recomendación:** Framework de 6 criterios priorizados (en orden de peso):

1. **Credibilidad institucional verificable (peso 30%):** Que un rector pueda googlear el nombre y encontrar al menos 5 fuentes públicas validando trayectoria (publicaciones indexadas, cargos, premios). Sin esto, el aval no funciona.
2. **Independencia de tu red personal (peso 20%):** Mínimo 3 de 5 NO deben ser exjefes, exdirectores de tesis ni amigos personales. Compradores institucionales detectan endogamia y descuentan el aval.
3. **Diversidad estructural (peso 15%):** 1 perfil pública (UNAM/IPN), 1 privada laica (ITAM/Tec), 1 privada confesional (Anáhuac/Iberoamericana), 1 internacional (preferentemente España/Chile con vínculo MX), 1 de organismo (exANUIES/CEPAL/OCDE-EDU).
4. **Especialidad complementaria entre los 5 (peso 15%):** Cubrir IA+educación, política educativa, economía laboral, evaluación curricular, gobernanza universitaria. Repetidos = redundancia.
5. **Disponibilidad real declarada (peso 10%):** En la primera conversación deben confirmar capacidad de 1 reunión trimestral de 90 min + revisar 1 documento metodológico al año. Si dudan, pasa.
6. **Postura pública sobre IA (peso 10%):** No tomes "tecnoescépticos absolutos" — generan fricción interna en cada release. Busca críticos rigurosos pero abiertos.

**Perfil ideal del top 5:** 1 rector emérito de pública, 1 exdirector ANUIES o subsecretario SEP, 1 investigador SNI III en economía laboral o capital humano, 1 catedrático en IA aplicada con publicaciones en educación, 1 referente internacional (CEPAL, BID-EDU, UNESCO-IESALC).

**Compensación recomendada:** NO equity (complica cap table cuando levantes). Honorario simbólico de $15-25k MXN/año + crédito formal en `/sobre-nosotros` + invitación con todos los gastos al evento anual OIA-EE Summit (cuando exista). Equivalente al modelo **Y Combinator advisor track**, no al modelo startup-equity-1%.

**Pedido operativo:** 1 reunión/trimestre (4/año), revisión metodológica anual del KPI Engine, presencia/keynote en evento anual, derecho a revisar pero NO veto sobre publicaciones. Carta de acuerdo de 1 página, NDA mutuo, cláusula de salida limpia.

**Indicador de éxito (6 meses):** Al menos 2 prospectos Enterprise mencionan espontáneamente algún nombre de la Junta como factor de confianza en proceso de venta.

**Acción inmediata (48h):** Hacer lista larga de 25 candidatos contra los 6 criterios, asignar score, quedarte con top 10 y empezar outreach con los primeros 3 vía email personalizado de 2 párrafos.

---

## Decisión 5 — Criterios para IES piloto + estructura legal

**Contexto en una línea:** El piloto es el único caso de éxito que tendrás durante 12-18 meses — su selección define tu narrativa de venta entera.

**5 criterios de selección priorizados:**

1. **Tamaño Goldilocks (peso 25%):** 8,000-25,000 alumnos. Más chica → no resuena con tu ICP Enterprise. Más grande → política interna paraliza el piloto.
2. **Apertura cultural a datos y a IA (peso 25%):** Rector con discurso público pro-innovación en últimos 24 meses (entrevistas, conferencias, publicaciones). NO confundir con "le gusta la tecnología" — busca evidencia de decisiones tomadas con datos.
3. **Diversidad de oferta académica (peso 20%):** Mínimo 12 carreras, mix de áreas (ingenierías, sociales, salud, negocios). Una IES monotemática produce un caso de éxito difícil de generalizar comercialmente.
4. **Proximidad geográfica y temporal (peso 15%):** CDMX/Monterrey/Guadalajara, accesible en vuelo del día. Reuniones presenciales son críticas en piloto — el ahorro logístico determina si haces 2 o 6 visitas durante el piloto.
5. **Estabilidad del rector (peso 15%):** Rector con al menos 18 meses restantes de gestión y reelegibilidad o continuidad probable. NO firmes piloto con rector que sale en 6 meses, ya lo viviste como riesgo y se materializa el 40% de las veces.

**Estructura legal del piloto:**
- **Documento:** Convenio de Colaboración Académica (no contrato comercial), 4-6 páginas máximo. Más limpio fiscal y políticamente que un contrato de servicios con descuento.
- **Tú entregas:** Plataforma Pro durante 12 meses, onboarding completo, 2 sesiones de capacitación a equipo académico, 1 Estudio de Pertinencia profundo, soporte por email con SLA 48h hábiles.
- **IES entrega:** Datos académicos para integración (matrícula, oferta, egresados últimos 3 años), 1 caso de estudio publicable conjunto, 2 testimonios en video del rector + director académico, derecho a usar logo en `/clientes` y materiales comerciales por 36 meses, 2 referencias telefónicas para prospectos cuando se solicite.
- **Lo que NO entregas:** SLA 24/7, integraciones SIIA custom adicionales, white-label avanzado (eso es Enterprise pagado).
- **Cláusula testimonial:** Explícita y firmada al inicio, no negociada al final cuando te pueden chantajear con "no firmamos el testimonial si no nos das otro año gratis".
- **Precio:** $30k MXN/mes facturados (descuento 70% sobre Pro) — NO gratis. Cero pago elimina compromiso del lado IES y degrada el caso de éxito ("nos lo regalaron, no lo usamos en serio").

**Riesgos y mitigaciones:**
- **Cambio de rector a mitad del año:** Cláusula de continuidad — el convenio sobrevive cambios de gestión y el nuevo rector tiene 60 días para ratificar o salir sin penalidad. Mitigación adicional: cultivar relación con director académico y vicerrector desde día 1, no solo con el rector.
- **Diagnóstico negativo para la IES:** Esto es real y vas a enfrentarlo. Cláusula explícita: "OIA-EE entrega análisis basado en metodología pública; la IES tiene derecho a respuesta editorial de 1 página en cualquier estudio publicable conjunto, pero no derecho de veto sobre los hallazgos del diagnóstico interno." En la práctica: usa diagnósticos negativos como insumo para acompañamiento (eso es lo que vendes), no los publiques externamente sin aprobación. Esto preserva tu independencia metodológica y la dignidad institucional del cliente.
- **Piloto pasivo (firman pero no usan):** Métrica de uso mínima en el convenio — al menos 1 sesión de revisión trimestral con el equipo académico, si no se cumplen 2 trimestres seguidos el descuento del 70% se reduce al 40% en la renovación.

**Conversión de piloto a cliente pagante:**
- Mes 9 del piloto: revisión ejecutiva con el rector con tres entregables tangibles (Estudio de Pertinencia, dashboard de uso interno, 2 decisiones de portafolio académico tomadas con OIA-EE).
- Mes 10: oferta formal de renovación a Pro normal ($35k/mes) con grandfathering de descuento del 30% por 12 meses adicionales como reconocimiento de "cliente fundador".
- Mes 11: si no cierra renovación, escalado a Enterprise con propuesta de white-label completo + integraciones SIIA premium para crear nuevo anchor.

**Indicador de éxito (6 meses):** Convenio firmado, integración SIIA productiva, primer Estudio de Pertinencia entregado y al menos 1 testimonio en video grabado.

**Acción inmediata (48h):** Construir lista de 15 IES filtradas por los 5 criterios usando ANUIES + sitios institucionales + LinkedIn de rectores. Priorizar por score y empezar outreach a top 3 vía warm intro de tu red doctoral, no via email frío.

---

## Resumen — 5 acciones inmediatas priorizadas por urgencia

1. **HOY:** Reescribir copy de `/pertinencia` resolviendo la contradicción gratis/$120k (Decisión 1) — sangra credibilidad cada hora que pasa.
2. **Esta semana:** Construir lista corta de 15 IES candidatas a piloto y arrancar outreach a top 3 vía warm intro (Decisión 5).
3. **Próximos 14 días:** Postear vacante de investigador/escritor part-time en LinkedIn y red doctoral (Decisión 3).
4. **Próximos 21 días:** Lista larga de 25 candidatos a Junta Asesora con scoring 6 criterios y outreach a primeros 3 (Decisión 4).
5. **Después del piloto firmado:** Implementar flag `trial_expires_at` para trial de 30 días Pro, NO antes — el piloto y el trial son herramientas distintas para etapas distintas (Decisión 2).

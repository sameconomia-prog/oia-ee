import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { PertinenciaReportData, SkillNode } from './types'

// ── Paleta ────────────────────────────────────────────────────────────────
const INDIGO    = [79, 70, 229]  as [number, number, number]
const INDIGO_DK = [49, 46, 129]  as [number, number, number]
const INDIGO_LT = [199, 210, 254] as [number, number, number]
const TEAL      = [13, 148, 136] as [number, number, number]
const RED       = [220, 38, 38]  as [number, number, number]
const GREEN     = [16, 185, 129] as [number, number, number]
const AMBER     = [245, 158, 11] as [number, number, number]
const GRAY      = [107, 114, 128] as [number, number, number]
const GRAY_LT   = [241, 245, 249] as [number, number, number]
const WHITE     = [255, 255, 255] as [number, number, number]
const DARK      = [15, 23, 42]   as [number, number, number]

const W = 216
const H = 279
const TOTAL_PAGES = 11

function scoreColor(score: number, invert = false): [number, number, number] {
  const high = score >= 0.7
  const low  = score < 0.4
  if (invert) return high ? RED : low ? GREEN : AMBER
  return high ? GREEN : low ? RED : AMBER
}

function scoreLabel(score: number, invert = false): string {
  const high = score >= 0.7; const low = score < 0.4
  if (invert) return high ? 'ALTO' : low ? 'BAJO' : 'MEDIO'
  return high ? 'ALTO' : low ? 'BAJO' : 'MEDIO'
}

function semaforoLabel(val: string) {
  return val === 'verde' ? '🟢 Favorable' : val === 'rojo' ? '🔴 Crítico' : '🟡 Precaución'
}

function addHeader(doc: jsPDF, title: string, pageNum: number) {
  doc.setFillColor(...INDIGO)
  doc.rect(0, 0, W, 14, 'F')
  doc.setTextColor(...WHITE)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.text('OIA-EE · Estudio de Pertinencia Ad-hoc', 8, 9)
  doc.setFont('helvetica', 'normal')
  doc.text(title, W / 2, 9, { align: 'center' })
  doc.text(`Pág. ${pageNum} / ${TOTAL_PAGES}`, W - 8, 9, { align: 'right' })
}

function addFooter(doc: jsPDF, fecha: string) {
  const y = H - 8
  doc.setDrawColor(...INDIGO_LT)
  doc.setLineWidth(0.3)
  doc.line(8, y - 3, W - 8, y - 3)
  doc.setFontSize(6.5)
  doc.setTextColor(...GRAY)
  doc.setFont('helvetica', 'normal')
  doc.text(`Generado: ${fecha} · Confidencial — uso exclusivo de la institución solicitante`, 8, y)
  doc.text('oia-ee.com', W - 8, y, { align: 'right' })
}

function sectionTitle(doc: jsPDF, text: string, y: number) {
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...INDIGO)
  doc.text(text, 14, y)
  doc.setDrawColor(...INDIGO_LT)
  doc.setLineWidth(0.4)
  doc.line(14, y + 2, W - 14, y + 2)
}

function kpiBox(doc: jsPDF, x: number, y: number, w: number, h: number, label: string, score: number | null, invert = false) {
  const color = score != null ? scoreColor(score, invert) : GRAY
  doc.setFillColor(...GRAY_LT)
  doc.roundedRect(x, y, w, h, 2, 2, 'F')
  doc.setFillColor(...color)
  doc.roundedRect(x, y, w, 1.8, 0.5, 0.5, 'F')
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...color)
  doc.text(score != null ? score.toFixed(2) : '—', x + w / 2, y + h / 2 + 2, { align: 'center' })
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRAY)
  doc.text(label, x + w / 2, y + h - 3, { align: 'center' })
  if (score != null) {
    const lbl = scoreLabel(score, invert)
    doc.setFontSize(6)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...color)
    doc.text(lbl, x + w / 2, y + h / 2 + 7, { align: 'center' })
  }
}

function paragraph(doc: jsPDF, text: string, x: number, y: number, maxW = W - 28): number {
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...DARK)
  const lines = doc.splitTextToSize(text, maxW) as string[]
  doc.text(lines, x, y)
  return y + lines.length * 5
}

// ── P1: Portada ────────────────────────────────────────────────────────────
function pagPortada(doc: jsPDF, data: PertinenciaReportData, fecha: string) {
  doc.setFillColor(...INDIGO_DK)
  doc.rect(0, 0, W, 100, 'F')
  doc.setFillColor(...INDIGO)
  doc.rect(0, 75, W, 30, 'F')
  doc.setFillColor(...TEAL)
  doc.rect(0, 100, W, 4, 'F')

  doc.setTextColor(...WHITE)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('ESTUDIO DE PERTINENCIA AD-HOC', W / 2, 24, { align: 'center' })
  doc.text('OIA-EE — OBSERVATORIO DE IMPACTO IA EN EDUCACIÓN Y EMPLEO', W / 2, 31, { align: 'center' })

  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  const lines = doc.splitTextToSize(data.carrera.nombre, 180) as string[]
  doc.text(lines, W / 2, 52, { align: 'center' })

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(data.solicitud.ies_nombre, W / 2, 52 + lines.length * 10 + 6, { align: 'center' })

  doc.setFontSize(7.5)
  doc.setTextColor(199, 210, 254)
  doc.text(`Solicitado por: ${data.solicitud.nombre_contacto}`, W / 2, 84, { align: 'center' })
  doc.text(`Fecha de solicitud: ${data.solicitud.fecha_solicitud} · Fecha de generación: ${fecha}`, W / 2, 91, { align: 'center' })

  // Bloque carrera
  doc.setFillColor(...WHITE)
  doc.roundedRect(20, 115, W - 40, 55, 3, 3, 'F')
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...INDIGO)
  doc.text('INFORMACIÓN DE LA CARRERA', W / 2, 125, { align: 'center' })
  const meta: [string, string][] = [
    ['Área de conocimiento', data.carrera.area_conocimiento ?? 'No especificada'],
    ['Nivel educativo', data.carrera.nivel ?? 'Licenciatura'],
    ['Duración', data.carrera.duracion_anios ? `${data.carrera.duracion_anios} años` : '—'],
    ['Instituciones que la ofrecen', String(data.carrera.instituciones_count)],
    ['Matrícula total estimada', data.carrera.matricula_total != null ? data.carrera.matricula_total.toLocaleString('es-MX') : '—'],
  ]
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...DARK)
  meta.forEach(([k, v], i) => {
    const col = i < 3 ? 0 : 1
    const row = col === 0 ? i : i - 3
    doc.text(`${k}:`, 30 + col * 88, 135 + row * 8)
    doc.setFont('helvetica', 'bold')
    doc.text(v, 30 + col * 88, 141 + row * 8)
    doc.setFont('helvetica', 'normal')
  })

  // Tabla contenido
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...INDIGO)
  doc.text('CONTENIDO', 14, 185)
  const toc = [
    '2. Resumen Ejecutivo y Diagnóstico',
    '3. Metodología OIA-EE (D1–D6)',
    '4. D1 Obsolescencia — Análisis Detallado',
    '5. D2 Oportunidades — Análisis Detallado',
    '6. D3 Mercado Laboral y D6 Perfil Estudiantil',
    '7. Skills en Transición por IA',
    '8. Comparativo Sectorial Nacional',
    '9. Proyección 1, 3 y 5 años',
    '10. Plan de Actualización Curricular',
    '11. Fuentes, Glosario y Limitaciones',
  ]
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...DARK)
  doc.setFontSize(7.5)
  toc.forEach((line, i) => doc.text(line, 20, 194 + i * 7.5))

  doc.setFontSize(6.5)
  doc.setTextColor(...GRAY)
  doc.text('Documento confidencial — elaborado exclusivamente para la institución solicitante. Prohibida su difusión sin autorización de OIA-EE.', W / 2, H - 10, { align: 'center' })
}

// ── P2: Resumen Ejecutivo ─────────────────────────────────────────────────
function pagResumen(doc: jsPDF, data: PertinenciaReportData, fecha: string) {
  doc.addPage()
  addHeader(doc, 'Resumen Ejecutivo', 2)
  addFooter(doc, fecha)

  const d1 = data.kpi?.d1_obsolescencia.score ?? null
  const d2 = data.kpi?.d2_oportunidades.score ?? null
  const d3 = data.kpi?.d3_mercado?.score ?? null
  const d6 = data.kpi?.d6_estudiantil?.score ?? null

  sectionTitle(doc, 'Diagnóstico General', 24)

  kpiBox(doc, 10, 30, 44, 32, 'D1 Obsolescencia', d1, true)
  kpiBox(doc, 58, 30, 44, 32, 'D2 Oportunidades', d2)
  kpiBox(doc, 106, 30, 44, 32, 'D3 Mercado laboral', d3)
  kpiBox(doc, 154, 30, 44, 32, 'D6 Estudiantil', d6)

  // Semáforo proyecciones
  if (data.semaforo) {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...DARK)
    doc.text('Proyección motor predictivo:', 14, 72)
    const proyItems = [
      ['1 año', data.semaforo.proyeccion_1a],
      ['3 años', data.semaforo.proyeccion_3a],
      ['5 años', data.semaforo.proyeccion_5a],
    ]
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    proyItems.forEach(([t, v], i) => {
      doc.text(`${t}: ${semaforoLabel(v)}`, 14 + i * 65, 79)
    })
  }

  sectionTitle(doc, 'Hallazgos Clave', 90)

  const bullets: string[] = []
  if (d1 != null) {
    if (d1 >= 0.7) bullets.push(`La carrera presenta un riesgo ALTO de obsolescencia por IA (D1 = ${d1.toFixed(2)}), superando el promedio nacional de ${data.nacional.promedio_d1.toFixed(2)}.`)
    else if (d1 >= 0.4) bullets.push(`El riesgo de obsolescencia es MEDIO (D1 = ${d1.toFixed(2)}). Se recomienda monitoreo continuo y actualización de plan de estudios.`)
    else bullets.push(`El riesgo de obsolescencia es BAJO (D1 = ${d1.toFixed(2)}). La carrera muestra resiliencia ante la automatización por IA.`)
  }
  if (d2 != null) {
    if (d2 >= 0.7) bullets.push(`Existe alta demanda laboral (D2 = ${d2.toFixed(2)}): las vacantes relacionadas y los indicadores de empleo son favorables.`)
    else if (d2 < 0.4) bullets.push(`La demanda laboral es baja (D2 = ${d2.toFixed(2)}): el mercado laboral para egresados muestra señales de contracción.`)
    else bullets.push(`La demanda laboral es moderada (D2 = ${d2.toFixed(2)}): existen oportunidades pero con competencia creciente por IA.`)
  }
  if (data.skills && data.skills.pct_en_transicion > 50) {
    bullets.push(`El ${data.skills.pct_en_transicion.toFixed(0)}% de las habilidades del plan de estudios están en transición por IA (automatizables o en augmentación).`)
  }
  if (data.comparables.length > 0) {
    const posicion = data.comparables.findIndex(c => c.carrera_id === data.carrera.id) + 1
    if (posicion > 0) bullets.push(`En el ranking nacional por riesgo D1, esta carrera ocupa la posición ${posicion} de ${data.comparables.length} carreras analizadas en el área.`)
  }

  let curY = 97
  bullets.forEach((b, i) => {
    doc.setFillColor(...INDIGO)
    doc.circle(17, curY - 1.5, 1.2, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...DARK)
    const lines = doc.splitTextToSize(b, W - 40) as string[]
    doc.text(lines, 21, curY)
    curY += lines.length * 5 + 4
    if (i === 0) curY += 2
  })

  sectionTitle(doc, 'Comparativo con Promedios Nacionales', curY + 6)
  curY += 12

  autoTable(doc, {
    startY: curY,
    head: [['Dimensión', 'Esta Carrera', 'Promedio Nacional', 'Diferencia', 'Interpretación']],
    body: [
      ['D1 Obsolescencia', d1?.toFixed(2) ?? '—', data.nacional.promedio_d1.toFixed(2),
        d1 != null ? (d1 - data.nacional.promedio_d1 > 0 ? `+${(d1 - data.nacional.promedio_d1).toFixed(2)}` : (d1 - data.nacional.promedio_d1).toFixed(2)) : '—',
        d1 != null ? (d1 > data.nacional.promedio_d1 ? 'Riesgo mayor al promedio' : 'Mejor que el promedio') : '—'],
      ['D2 Oportunidades', d2?.toFixed(2) ?? '—', data.nacional.promedio_d2.toFixed(2),
        d2 != null ? (d2 - data.nacional.promedio_d2 > 0 ? `+${(d2 - data.nacional.promedio_d2).toFixed(2)}` : (d2 - data.nacional.promedio_d2).toFixed(2)) : '—',
        d2 != null ? (d2 > data.nacional.promedio_d2 ? 'Mejor que el promedio' : 'Por debajo del promedio') : '—'],
      ['D3 Mercado', d3?.toFixed(2) ?? '—', data.nacional.promedio_d3.toFixed(2),
        d3 != null ? (d3 - data.nacional.promedio_d3 > 0 ? `+${(d3 - data.nacional.promedio_d3).toFixed(2)}` : (d3 - data.nacional.promedio_d3).toFixed(2)) : '—',
        d3 != null ? (d3 > data.nacional.promedio_d3 ? 'Favorable' : 'Por debajo del promedio') : '—'],
    ],
    theme: 'striped',
    headStyles: { fillColor: INDIGO_DK, fontSize: 7.5, textColor: WHITE },
    bodyStyles: { fontSize: 7.5 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 8, right: 8 },
  })
}

// ── P3: Metodología ───────────────────────────────────────────────────────
function pagMetodologia(doc: jsPDF, fecha: string) {
  doc.addPage()
  addHeader(doc, 'Metodología OIA-EE', 3)
  addFooter(doc, fecha)

  sectionTitle(doc, 'Marco Metodológico', 24)

  let y = 32
  y = paragraph(doc, 'OIA-EE aplica un modelo de 6 dimensiones de análisis (D1–D6) que integran datos de fuentes públicas oficiales (IMSS, INEGI ENOE, ANUIES-SEP) con datos de mercado laboral en tiempo real (vacantes OCC México) y noticias de impacto IA (NewsAPI + clasificación Groq/Claude). La evaluación sigue la taxonomía de exposición a IA de Frey-Osborne (2013), adaptada al contexto educativo mexicano con actualización 2024–2025.', 14, y)

  y += 6
  sectionTitle(doc, 'Dimensiones de Análisis', y)
  y += 8

  const dims = [
    ['D1 — Obsolescencia', 'Riesgo de que las competencias enseñadas sean automatizables por IA en 5 años.', 'IVA: Índice de Vacantes IA en área\nBES: Brecha de Empleabilidad Sectorial\nVAC: Velocidad de Adaptación Curricular', 'Frey & Osborne (2013), Eloundou et al. (2024), OCC México'],
    ['D2 — Oportunidades', 'Demanda laboral activa y perspectivas de empleo para egresados.', 'IOE: Índice de Oportunidades de Empleo\nIHE: Indicador Histórico de Empleabilidad\nIEA: Índice de Expansión del Área', 'OCC México, IMSS afiliados, STPS ENOE'],
    ['D3 — Mercado Laboral', 'Condiciones macroeconómicas del mercado de trabajo en el sector.', 'TDM: Tasa de Desempleo Macro\nTVC: Tendencia de Vacantes en el Ciclo\nBRS: Brecha Salarial\nICE: Índice de Crecimiento del Empleo', 'INEGI ENOE Q, IMSS Empleo Formal mensual'],
    ['D6 — Perfil Estudiantil', 'Eficiencia terminal, costo-beneficio y empleabilidad real del egresado.', 'IEI: Índice de Eficiencia Institucional\nCRC: Costo Relativo de la Carrera\nROI-E: Retorno sobre Inversión Educativa', 'ANUIES, SEP SIEE, encuestas egresados'],
  ]

  dims.forEach(([dim, desc, indicadores, fuentes]) => {
    if (y > H - 50) { return }
    doc.setFillColor(...GRAY_LT)
    doc.roundedRect(10, y, W - 20, 30, 2, 2, 'F')
    doc.setFillColor(...INDIGO)
    doc.roundedRect(10, y, 3, 30, 1, 1, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...INDIGO_DK)
    doc.text(dim, 17, y + 7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...DARK)
    doc.setFontSize(7)
    const descLines = doc.splitTextToSize(desc, 120) as string[]
    doc.text(descLines, 17, y + 13)
    doc.setFontSize(6.5)
    doc.setTextColor(...GRAY)
    indicadores.split('\n').forEach((ind, i) => doc.text(`· ${ind}`, 17, y + 13 + descLines.length * 4.5 + i * 4))
    doc.setTextColor([155, 155, 175] as unknown as string)
    doc.text(`Fuentes: ${fuentes}`, W - 14, y + 7, { align: 'right' })
    y += 35
  })

  y += 4
  sectionTitle(doc, 'Escala de Semáforo', y)
  y += 8

  autoTable(doc, {
    startY: y,
    head: [['Rango', 'D1 Obsolescencia', 'D2/D3/D6 Resto']],
    body: [
      ['≥ 0.70', 'ALTO — Riesgo elevado de automatización', 'ALTO — Condición favorable'],
      ['0.40 – 0.69', 'MEDIO — Monitoreo recomendado', 'MEDIO — Condición moderada'],
      ['< 0.40', 'BAJO — Riesgo controlado', 'BAJO — Condición desfavorable'],
    ],
    theme: 'grid',
    headStyles: { fillColor: INDIGO, fontSize: 7.5, textColor: WHITE },
    bodyStyles: { fontSize: 7.5 },
    columnStyles: { 0: { cellWidth: 30, halign: 'center' }, 1: { cellWidth: 88 }, 2: { cellWidth: 88 } },
    margin: { left: 8, right: 8 },
    didParseCell(h) {
      if (h.section !== 'body') return
      if (h.column.index === 0) {
        h.cell.styles.fontStyle = 'bold'
        h.cell.styles.textColor = h.row.index === 0 ? RED : h.row.index === 2 ? GREEN : AMBER
      }
    },
  })
}

// ── P4: D1 Detalle ────────────────────────────────────────────────────────
function pagD1(doc: jsPDF, data: PertinenciaReportData, fecha: string) {
  doc.addPage()
  addHeader(doc, 'D1 — Obsolescencia', 4)
  addFooter(doc, fecha)

  const d1 = data.kpi?.d1_obsolescencia
  sectionTitle(doc, 'D1 Obsolescencia — Análisis Detallado', 24)

  let y = 32
  const intro = 'El indicador D1 mide la probabilidad de que el conjunto de competencias que enseña esta carrera sean sustituibles por sistemas de inteligencia artificial en un horizonte de 5 años. Se construye como promedio ponderado de tres sub-indicadores: IVA (exposición sectorial a IA), BES (brecha de empleabilidad sectorial) y VAC (velocidad de adaptación curricular observada en otras IES que ofrecen la misma carrera).'
  y = paragraph(doc, intro, 14, y)

  y += 5
  if (d1) {
    kpiBox(doc, W / 2 - 30, y, 60, 36, 'D1 Obsolescencia (0–1)', d1.score, true)
    y += 42

    autoTable(doc, {
      startY: y,
      head: [['Sub-indicador', 'Valor', 'Peso', 'Descripción']],
      body: [
        ['IVA — Índice de Vacantes IA', d1.iva.toFixed(3), '40%', 'Proporción de vacantes IA publicadas en OCC en el área en los últimos 12 meses'],
        ['BES — Brecha de Empleabilidad Sectorial', d1.bes.toFixed(3), '35%', 'Diferencia entre egresados y vacantes disponibles en el sector (IMSS + OCC)'],
        ['VAC — Velocidad de Adaptación Curricular', d1.vac.toFixed(3), '25%', 'Tasa de actualización de planes de estudio vs. ritmo de cambio tecnológico'],
      ],
      theme: 'striped',
      headStyles: { fillColor: INDIGO_DK, fontSize: 7.5, textColor: WHITE },
      bodyStyles: { fontSize: 7.5 },
      columnStyles: {
        0: { cellWidth: 72 },
        1: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 84 },
      },
      margin: { left: 8, right: 8 },
    })
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
  }

  sectionTitle(doc, 'Interpretación y Riesgos Específicos', y)
  y += 8

  const nivel = d1 ? (d1.score >= 0.7 ? 'alto' : d1.score >= 0.4 ? 'moderado' : 'bajo') : 'indeterminado'
  const interp = `El nivel de riesgo de obsolescencia para ${data.carrera.nombre} es ${nivel.toUpperCase()}. ${
    nivel === 'alto' ? 'Esto implica que una parte significativa del perfil de egreso incluye tareas altamente automatizables por modelos de lenguaje (LLM) y agentes IA. Se recomienda iniciar una revisión curricular de emergencia orientada a habilidades de supervisión, juicio crítico y diseño de sistemas IA.' :
    nivel === 'moderado' ? 'Existe un riesgo moderado que debe atenderse de forma proactiva. Las competencias técnicas rutinarias de la carrera tienen exposición a automatización, pero las habilidades relacionales, estratégicas y creativas proveen un colchón de empleabilidad.' :
    'El perfil de egreso incluye competencias con alta resiliencia ante la automatización. Sin embargo, se recomienda integrar módulos de flujo de trabajo con IA para mantener la ventaja competitiva de los egresados.'
  }`
  y = paragraph(doc, interp, 14, y)
}

// ── P5: D2 Detalle ────────────────────────────────────────────────────────
function pagD2(doc: jsPDF, data: PertinenciaReportData, fecha: string) {
  doc.addPage()
  addHeader(doc, 'D2 — Oportunidades', 5)
  addFooter(doc, fecha)

  const d2 = data.kpi?.d2_oportunidades
  sectionTitle(doc, 'D2 Oportunidades — Análisis Detallado', 24)

  let y = 32
  y = paragraph(doc, 'El indicador D2 mide la demanda laboral real y las perspectivas de empleo para los egresados de esta carrera. Integra la oferta activa de vacantes (IOE), el historial de empleabilidad sectorial (IHE) y la tasa de expansión del área de conocimiento en el mercado (IEA). Un D2 alto indica un mercado laboral favorable y creciente para la disciplina.', 14, y)

  y += 5
  if (d2) {
    kpiBox(doc, W / 2 - 30, y, 60, 36, 'D2 Oportunidades (0–1)', d2.score)
    y += 42

    autoTable(doc, {
      startY: y,
      head: [['Sub-indicador', 'Valor', 'Peso', 'Descripción']],
      body: [
        ['IOE — Índice de Oportunidades de Empleo', d2.ioe.toFixed(3), '40%', 'Vacantes activas en OCC México para el área en los últimos 30 días (normalizado)'],
        ['IHE — Indicador Histórico de Empleabilidad', d2.ihe.toFixed(3), '35%', 'Tendencia de afiliados IMSS en el sector durante los últimos 24 meses'],
        ['IEA — Índice de Expansión del Área', d2.iea.toFixed(3), '25%', 'Crecimiento porcentual de vacantes en el área año contra año (OCC + STPS)'],
      ],
      theme: 'striped',
      headStyles: { fillColor: TEAL, fontSize: 7.5, textColor: WHITE },
      bodyStyles: { fontSize: 7.5 },
      columnStyles: {
        0: { cellWidth: 74 },
        1: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
        2: { cellWidth: 18, halign: 'center' },
        3: { cellWidth: 86 },
      },
      margin: { left: 8, right: 8 },
    })
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
  }

  sectionTitle(doc, 'Interpretación', y)
  y += 8
  const nivel = d2 ? (d2.score >= 0.7 ? 'alto' : d2.score >= 0.4 ? 'moderado' : 'bajo') : 'indeterminado'
  const interp = `El nivel de oportunidad laboral para ${data.carrera.nombre} es ${nivel.toUpperCase()}. ${
    nivel === 'alto' ? 'El mercado laboral muestra una demanda robusta y en expansión para los egresados. Es un momento favorable para fortalecer la oferta de matrícula y los vínculos con empleadores.' :
    nivel === 'moderado' ? 'Existe demanda laboral moderada. Se recomienda fortalecer los programas de vinculación empresa-universidad y alinear más explícitamente el perfil de egreso con las competencias más demandadas en las vacantes activas.' :
    'La demanda laboral es baja. Se recomienda revisar la viabilidad de la carrera y evaluar opciones de fusión, reconversión o actualización radical del perfil de egreso hacia áreas con mayor demanda.'
  }`
  paragraph(doc, interp, 14, y)
}

// ── P6: D3 y D6 ───────────────────────────────────────────────────────────
function pagD3D6(doc: jsPDF, data: PertinenciaReportData, fecha: string) {
  doc.addPage()
  addHeader(doc, 'D3 Mercado Laboral · D6 Estudiantil', 6)
  addFooter(doc, fecha)

  const d3 = data.kpi?.d3_mercado
  const d6 = data.kpi?.d6_estudiantil

  sectionTitle(doc, 'D3 — Mercado Laboral', 24)
  let y = 32

  if (d3) {
    kpiBox(doc, 10, y, 44, 28, 'D3 Mercado (0–1)', d3.score)
    const subRows = [
      ['TDM', d3.tdm.toFixed(3), 'Tasa de Desempleo Macro del sector (ENOE)'],
      ['TVC', d3.tvc.toFixed(3), 'Tendencia de Vacantes en el Ciclo (OCC 12m)'],
      ['BRS', d3.brs.toFixed(3), 'Brecha Salarial vs. salario mediano sectorial'],
      ['ICE', d3.ice.toFixed(3), 'Índice de Crecimiento del Empleo (IMSS)'],
    ]
    autoTable(doc, {
      startY: y,
      head: [['Sub-indicador', 'Valor', 'Descripción']],
      body: subRows,
      theme: 'striped',
      headStyles: { fillColor: INDIGO, fontSize: 7.5, textColor: WHITE },
      bodyStyles: { fontSize: 7 },
      columnStyles: { 0: { cellWidth: 30 }, 1: { cellWidth: 20, halign: 'center' }, 2: { cellWidth: 108 } },
      margin: { left: 60, right: 8 },
    })
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
  } else {
    y = paragraph(doc, 'Datos D3 no disponibles para esta carrera. El cálculo requiere al menos 4 períodos de datos históricos ENOE + IMSS.', 14, y + 4)
    y += 4
  }

  sectionTitle(doc, 'D6 — Perfil Estudiantil', y)
  y += 8

  if (d6) {
    kpiBox(doc, 10, y, 44, 28, 'D6 Estudiantil (0–1)', d6.score)
    const subRows6 = [
      ['IEI', d6.iei.toFixed(3), 'Índice de Eficiencia Institucional (egresados/matriculados ANUIES)'],
      ['CRC', d6.crc.toFixed(3), 'Costo Relativo de la Carrera (costo anual vs. promedio área SEP)'],
      ['ROI-E', d6.roi_e.toFixed(3), 'Retorno sobre Inversión Educativa (salario/costo formación)'],
    ]
    autoTable(doc, {
      startY: y,
      head: [['Sub-indicador', 'Valor', 'Descripción']],
      body: subRows6,
      theme: 'striped',
      headStyles: { fillColor: TEAL, fontSize: 7.5, textColor: WHITE },
      bodyStyles: { fontSize: 7 },
      columnStyles: { 0: { cellWidth: 30 }, 1: { cellWidth: 20, halign: 'center' }, 2: { cellWidth: 108 } },
      margin: { left: 60, right: 8 },
    })
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
  } else {
    y = paragraph(doc, 'Datos D6 no disponibles. Requiere datos de eficiencia terminal y costos de ANUIES/SEP para esta carrera.', 14, y + 4)
    y += 4
  }

  sectionTitle(doc, 'Síntesis', y)
  y += 8
  const d1s = data.kpi?.d1_obsolescencia.score
  paragraph(doc, `Esta carrera presenta el siguiente perfil en las 4 dimensiones analizadas: D1 Obsolescencia ${d1s != null ? d1s.toFixed(2) + ' (' + scoreLabel(d1s, true) + ')' : '—'}, D2 Oportunidades ${d3?.score != null ? d3.score.toFixed(2) : data.kpi?.d2_oportunidades?.score?.toFixed(2) ?? '—'}, D3 Mercado ${d3?.score?.toFixed(2) ?? '—'}, D6 Estudiantil ${d6?.score?.toFixed(2) ?? '—'}. Consulte las páginas de análisis detallado para las recomendaciones específicas por dimensión.`, 14, y)
}

// ── P7: Skills IA ─────────────────────────────────────────────────────────
function pagSkills(doc: jsPDF, data: PertinenciaReportData, fecha: string) {
  doc.addPage()
  addHeader(doc, 'Skills en Transición por IA', 7)
  addFooter(doc, fecha)

  const sg = data.skills
  sectionTitle(doc, 'Análisis de Habilidades por Exposición a IA', 24)
  let y = 32

  if (!sg || sg.skills.length === 0) {
    paragraph(doc, 'Datos de skills no disponibles para esta carrera.', 14, y)
    return
  }

  // Stats chips
  const automated = sg.skills.filter(s => s.ia_label === 'automated').length
  const augmented  = sg.skills.filter(s => s.ia_label === 'augmented').length
  const resilient  = sg.skills.filter(s => s.ia_label === 'resilient').length

  const chips: [string, number, [number,number,number]][] = [
    ['Automatizables', automated, RED],
    ['En Augmentación', augmented, AMBER],
    ['Resilientes', resilient, GREEN],
    ['% en Transición', sg.pct_en_transicion, INDIGO],
  ]
  chips.forEach(([label, val, color], i) => {
    const x = 10 + i * 50
    doc.setFillColor(...GRAY_LT)
    doc.roundedRect(x, y, 46, 20, 2, 2, 'F')
    doc.setFillColor(...color)
    doc.roundedRect(x, y, 46, 1.5, 0.5, 0.5, 'F')
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...color)
    doc.text(i < 3 ? String(val) : `${(val as number).toFixed(0)}%`, x + 23, y + 11, { align: 'center' })
    doc.setFontSize(6.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRAY)
    doc.text(label, x + 23, y + 17, { align: 'center' })
  })
  y += 26

  y = paragraph(doc, `De los ${sg.skill_count} skills identificados, el ${sg.pct_en_transicion.toFixed(0)}% están en transición por IA: ${automated} son altamente automatizables (susceptibles de reemplazo), ${augmented} están en augmentación (el rol del profesional se transforma con IA como copiloto), y ${resilient} son resilientes (requieren juicio humano irreducible por IA en el horizonte 5 años).`, 14, y)

  y += 4
  const sorted = [...sg.skills].sort((a, b) => {
    const order: Record<string, number> = { automated: 0, augmented: 1, resilient: 2 }
    return order[a.ia_label] - order[b.ia_label]
  })
  const bodyRows = sorted.slice(0, 30).map((s: SkillNode) => [
    s.name,
    s.ia_label === 'automated' ? 'Automatizable' : s.ia_label === 'augmented' ? 'Augmentación' : 'Resiliente',
    s.weight.toFixed(0),
    s.ia_score.toFixed(2),
    s.trend_12m > 0 ? `+${(s.trend_12m * 100).toFixed(0)}%` : `${(s.trend_12m * 100).toFixed(0)}%`,
  ])

  autoTable(doc, {
    startY: y,
    head: [['Habilidad', 'Clasificación IA', 'Frecuencia', 'Score IA', 'Tendencia 12m']],
    body: bodyRows,
    theme: 'striped',
    headStyles: { fillColor: INDIGO_DK, fontSize: 7, textColor: WHITE },
    bodyStyles: { fontSize: 6.5 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 72 },
      1: { cellWidth: 34, halign: 'center' },
      2: { cellWidth: 24, halign: 'center' },
      3: { cellWidth: 24, halign: 'center' },
      4: { cellWidth: 28, halign: 'center' },
    },
    margin: { left: 8, right: 8 },
    didParseCell(h) {
      if (h.section !== 'body' || h.column.index !== 1) return
      const v = h.cell.raw as string
      h.cell.styles.textColor = v === 'Automatizable' ? RED : v === 'Augmentación' ? AMBER : GREEN
      h.cell.styles.fontStyle = 'bold'
    },
  })
}

// ── P8: Comparativo Sectorial ─────────────────────────────────────────────
function pagComparativo(doc: jsPDF, data: PertinenciaReportData, fecha: string) {
  doc.addPage()
  addHeader(doc, 'Comparativo Sectorial Nacional', 8)
  addFooter(doc, fecha)

  sectionTitle(doc, `Ranking en Área: ${data.carrera.area_conocimiento ?? 'Nacional'}`, 24)

  let y = 32
  if (data.comparables.length === 0) {
    paragraph(doc, 'No se encontraron carreras comparables con datos KPI disponibles en el área de conocimiento.', 14, y)
    return
  }

  y = paragraph(doc, `Se presentan las carreras con mayor riesgo D1 en el área "${data.carrera.area_conocimiento ?? 'Nacional'}". Esta carrera se resalta en la tabla para facilitar el posicionamiento relativo.`, 14, y)
  y += 4

  const bodyRows = data.comparables.slice(0, 25).map((c, i) => [
    String(i + 1),
    c.nombre,
    c.d1_score.toFixed(2),
    scoreLabel(c.d1_score, true),
    c.d2_score.toFixed(2),
    c.matricula != null ? c.matricula.toLocaleString('es-MX') : '—',
  ])

  autoTable(doc, {
    startY: y,
    head: [['#', 'Carrera', 'D1 Riesgo', 'Nivel', 'D2 Oportunidad', 'Matrícula']],
    body: bodyRows,
    theme: 'striped',
    headStyles: { fillColor: INDIGO, fontSize: 7.5, textColor: WHITE },
    bodyStyles: { fontSize: 7 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 76 },
      2: { cellWidth: 22, halign: 'center' },
      3: { cellWidth: 24, halign: 'center', fontStyle: 'bold' },
      4: { cellWidth: 24, halign: 'center' },
      5: { cellWidth: 24, halign: 'center' },
    },
    margin: { left: 8, right: 8 },
    didParseCell(h) {
      if (h.section !== 'body') return
      const row = data.comparables[h.row.index]
      if (row?.carrera_id === data.carrera.id) {
        h.cell.styles.fillColor = INDIGO_LT
        h.cell.styles.fontStyle = 'bold'
      }
      if (h.column.index === 3) {
        const v = h.cell.raw as string
        h.cell.styles.textColor = v === 'ALTO' ? RED : v === 'BAJO' ? GREEN : AMBER
      }
    },
  })
}

// ── P9: Proyección ────────────────────────────────────────────────────────
function pagProyeccion(doc: jsPDF, data: PertinenciaReportData, fecha: string) {
  doc.addPage()
  addHeader(doc, 'Proyección 1 · 3 · 5 años', 9)
  addFooter(doc, fecha)

  sectionTitle(doc, 'Proyección Motor Predictivo OIA-EE', 24)
  let y = 32

  y = paragraph(doc, 'El motor predictivo de OIA-EE utiliza el modelo AutoETS (statsforecast) sobre series históricas de KPI para proyectar el indicador D1 Obsolescencia a 1, 3 y 5 años. Las bandas de confianza al 80% y 95% se calculan con remuestreo bootstrap. El semáforo refleja el escenario central (mediana).', 14, y)
  y += 6

  if (!data.semaforo) {
    y = paragraph(doc, 'Proyección no disponible. Se requieren al menos 8 períodos históricos de datos KPI para la carrera (mínimo 2 años de snapshots trimestrales).', 14, y)
    return
  }

  const { proyeccion_1a, proyeccion_3a, proyeccion_5a } = data.semaforo
  const proyRows: [string, string, string][] = [
    ['1 año', semaforoLabel(proyeccion_1a), proyeccion_1a === 'verde' ? 'Riesgo D1 controlado en el corto plazo. Mantener monitoreo trimestral.' : proyeccion_1a === 'rojo' ? 'Riesgo D1 elevado en 12 meses. Iniciar revisión curricular inmediata.' : 'Riesgo moderado. Identificar asignaturas de mayor exposición.'],
    ['3 años', semaforoLabel(proyeccion_3a), proyeccion_3a === 'verde' ? 'Perspectiva de mediano plazo favorable.' : proyeccion_3a === 'rojo' ? 'Punto crítico esperado en 3 años si no se interviene el currículo.' : 'Zona de alerta a mediano plazo. Planear actualización curricular para 2027.'],
    ['5 años', semaforoLabel(proyeccion_5a), proyeccion_5a === 'verde' ? 'La carrera mantiene pertinencia en el horizonte de planeación institucional.' : proyeccion_5a === 'rojo' ? 'Riesgo existencial para la carrera en su forma actual. Requiere transformación radical.' : 'Incertidumbre alta. El resultado depende de las decisiones curriculares de los próximos 2 años.'],
  ]

  autoTable(doc, {
    startY: y,
    head: [['Horizonte', 'Semáforo', 'Interpretación estratégica']],
    body: proyRows,
    theme: 'grid',
    headStyles: { fillColor: INDIGO_DK, fontSize: 8, textColor: WHITE },
    bodyStyles: { fontSize: 8, minCellHeight: 16 },
    columnStyles: { 0: { cellWidth: 22, halign: 'center' }, 1: { cellWidth: 44, halign: 'center' }, 2: { cellWidth: 130 } },
    margin: { left: 8, right: 8 },
  })
  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10

  sectionTitle(doc, 'Escenarios de Intervención', y)
  y += 8

  autoTable(doc, {
    startY: y,
    head: [['Escenario', 'Supuestos', 'Resultado D1 esperado 5a']],
    body: [
      ['Pesimista\n(sin intervención)', 'Plan de estudios sin cambios significativos. Adopción IA sectorial continúa al ritmo actual.', 'D1 ≥ 0.75 — riesgo muy alto'],
      ['Base\n(intervención moderada)', 'Actualización de 30-40% de asignaturas, integración de IA como herramienta transversal.', 'D1 0.50–0.65 — riesgo medio'],
      ['Optimista\n(transformación profunda)', 'Rediseño curricular completo centrado en habilidades resilientes + certificaciones IA.', 'D1 ≤ 0.40 — riesgo controlado'],
    ],
    theme: 'striped',
    headStyles: { fillColor: INDIGO, fontSize: 7.5, textColor: WHITE },
    bodyStyles: { fontSize: 7.5, minCellHeight: 14 },
    columnStyles: { 0: { cellWidth: 42, fontStyle: 'bold' }, 1: { cellWidth: 80 }, 2: { cellWidth: 74, halign: 'center' } },
    margin: { left: 8, right: 8 },
  })
}

// ── P10: Recomendaciones ──────────────────────────────────────────────────
function pagRecomendaciones(doc: jsPDF, data: PertinenciaReportData, fecha: string) {
  doc.addPage()
  addHeader(doc, 'Plan de Actualización Curricular', 10)
  addFooter(doc, fecha)

  sectionTitle(doc, 'Plan de Actualización Curricular Recomendado', 24)
  let y = 32

  const d1 = data.kpi?.d1_obsolescencia.score ?? 0.5
  const urgencia = d1 >= 0.7 ? 'URGENTE (iniciar en los próximos 60 días)' : d1 >= 0.4 ? 'PRIORITARIO (planificar para el próximo ciclo)' : 'PREVENTIVO (ciclo 2026-2027)'

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...(d1 >= 0.7 ? RED : d1 >= 0.4 ? AMBER : GREEN))
  doc.text(`Nivel de urgencia: ${urgencia}`, 14, y)
  y += 8

  const acciones = [
    {
      fase: 'Fase 1 — Diagnóstico (1-2 meses)',
      items: [
        'Mapear todas las asignaturas del plan de estudios vs. taxonomía de skills OIA-EE',
        'Identificar competencias "automatizables" que pueden eliminar o transformar',
        'Consultar con empleadores de los últimos 3 generaciones de egresados',
        'Revisar planes de estudio de IES líderes nacionales e internacionales en el área',
      ],
    },
    {
      fase: 'Fase 2 — Rediseño (3-6 meses)',
      items: [
        'Incorporar módulo transversal "IA para [nombre de la disciplina]" (mín. 6 créditos)',
        'Transformar asignaturas automatizables en asignaturas de supervisión y diseño de sistemas IA',
        'Agregar competencias de análisis crítico, ética profesional con IA y comunicación compleja',
        'Establecer alianza con empresa ancla para practicantes con uso intensivo de IA',
      ],
    },
    {
      fase: 'Fase 3 — Implementación (6-18 meses)',
      items: [
        'Actualizar plan de estudios en SEP/ANUIES con los cambios curriculares',
        'Capacitar docentes en uso de herramientas IA relevantes para la disciplina',
        'Diseñar evaluaciones basadas en proyectos con IA (no memorización)',
        'Monitorear D1/D2 trimestralmente en OIA-EE para medir impacto del rediseño',
      ],
    },
  ]

  acciones.forEach(({ fase, items }) => {
    doc.setFillColor(...INDIGO_LT)
    doc.roundedRect(10, y, W - 20, 7, 1.5, 1.5, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...INDIGO_DK)
    doc.text(fase, 14, y + 5)
    y += 9
    items.forEach(item => {
      doc.setFillColor(...GREEN)
      doc.circle(16, y + 0.5, 1, 'F')
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...DARK)
      const lines = doc.splitTextToSize(item, W - 38) as string[]
      doc.text(lines, 20, y + 1.5)
      y += lines.length * 4.5 + 2
    })
    y += 5
  })

  // CTA contacto
  doc.setFillColor(...INDIGO_DK)
  doc.roundedRect(10, y, W - 20, 22, 3, 3, 'F')
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...WHITE)
  doc.text('Acompañamiento OIA-EE — Sesión Ejecutiva de Seguimiento', W / 2, y + 8, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.text('Para una sesión de trabajo con el equipo de Planeación, agenda en: sam.economia@gmail.com', W / 2, y + 14, { align: 'center' })
  doc.text('Con la plataforma Pro, recibirás actualizaciones automáticas de tus indicadores cada 12 horas.', W / 2, y + 20, { align: 'center' })
}

// ── P11: Fuentes ──────────────────────────────────────────────────────────
function pagFuentes(doc: jsPDF, fecha: string) {
  doc.addPage()
  addHeader(doc, 'Fuentes, Glosario y Limitaciones', 11)
  addFooter(doc, fecha)

  sectionTitle(doc, 'Fuentes de Datos', 24)
  let y = 32

  autoTable(doc, {
    startY: y,
    head: [['Fuente', 'Descripción', 'Frecuencia', 'Indicador']],
    body: [
      ['OCC México', 'Vacantes de empleo con scraping automatizado', 'Cada 6 horas', 'D1 (IVA), D2 (IOE, IEA)'],
      ['IMSS — Afiliados', 'Empleo formal por sector SCIAN', 'Mensual (día 15)', 'D2 (IHE), D3 (ICE), D5'],
      ['INEGI ENOE', 'Tasa de desempleo y condiciones laborales', 'Trimestral', 'D3 (TDM), D5'],
      ['ANUIES — SIEE', 'Matrícula, egresados, eficiencia terminal', 'Anual', 'D6 (IEI, CRC)'],
      ['SEP — Formato 911', 'Costos y programas de estudio IES', 'Anual', 'D6 (CRC, ROI-E)'],
      ['NewsAPI + Groq', 'Noticias de impacto IA en educación y empleo', 'Cada 12 horas', 'D7 (ISN, VDM)'],
    ],
    theme: 'striped',
    headStyles: { fillColor: INDIGO, fontSize: 7.5, textColor: WHITE },
    bodyStyles: { fontSize: 7 },
    columnStyles: { 0: { cellWidth: 36 }, 1: { cellWidth: 72 }, 2: { cellWidth: 32 }, 3: { cellWidth: 56 } },
    margin: { left: 8, right: 8 },
  })

  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
  sectionTitle(doc, 'Glosario de Indicadores', y)
  y += 8

  const glosario = [
    ['D1 — Obsolescencia', 'Riesgo de que las competencias de la carrera sean automatizadas por IA en 5 años (escala 0-1, 1 = riesgo máximo).'],
    ['D2 — Oportunidades', 'Demanda laboral activa y creciente para los egresados (escala 0-1, 1 = máxima oportunidad).'],
    ['D3 — Mercado Laboral', 'Condiciones macroeconómicas del mercado de trabajo para el sector (0-1, 1 = condiciones favorables).'],
    ['D6 — Estudiantil', 'Eficiencia institucional y retorno sobre inversión educativa (0-1, 1 = mejor desempeño).'],
    ['IVA', 'Índice de Vacantes IA: proporción de vacantes en el área que requieren habilidades IA (OCC México).'],
    ['BES', 'Brecha de Empleabilidad Sectorial: diferencia entre oferta de egresados y demanda laboral disponible.'],
    ['IOE', 'Índice de Oportunidades de Empleo: vacantes activas para el área normalizadas por matrícula nacional.'],
  ]
  glosario.forEach(([term, def]) => {
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...INDIGO_DK)
    doc.text(term + ':', 14, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...DARK)
    const lines = doc.splitTextToSize(def, W - 80) as string[]
    doc.text(lines, 70, y)
    y += Math.max(lines.length * 4.5, 6)
  })

  y += 4
  sectionTitle(doc, 'Limitaciones y Notas Técnicas', y)
  y += 8
  const limitaciones = [
    'Los indicadores se calculan con datos disponibles públicamente. La calidad depende de la cobertura de IMSS/ANUIES para el área específica.',
    'El motor predictivo requiere mínimo 8 trimestres de datos históricos de KPI. Carreras con datos limitados muestran intervalos de confianza amplios.',
    'La clasificación de skills (automated/augmented/resilient) se basa en la taxonomía Frey-Osborne actualizada con literatura 2024-2025; puede haber variaciones por sub-especialidad.',
    'Los promedios nacionales incluyen únicamente carreras con al menos un ciclo de datos KPI disponible en la plataforma (cobertura estimada: 60-70% de carreras ANUIES).',
  ]
  limitaciones.forEach((l, i) => {
    doc.setFillColor(...GRAY)
    doc.circle(16, y - 1, 1, 'F')
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...DARK)
    const lines = doc.splitTextToSize(l, W - 34) as string[]
    doc.text(lines, 20, y)
    y += lines.length * 4.5 + 3
    if (i === 0) {}
  })
}

// ── Exportar ──────────────────────────────────────────────────────────────
export function generarReportePertinencia(data: PertinenciaReportData): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })
  const fecha = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })

  pagPortada(doc, data, fecha)
  pagResumen(doc, data, fecha)
  pagMetodologia(doc, fecha)
  pagD1(doc, data, fecha)
  pagD2(doc, data, fecha)
  pagD3D6(doc, data, fecha)
  pagSkills(doc, data, fecha)
  pagComparativo(doc, data, fecha)
  pagProyeccion(doc, data, fecha)
  pagRecomendaciones(doc, data, fecha)
  pagFuentes(doc, fecha)

  const nombre = data.carrera.nombre.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40)
  doc.save(`pertinencia_${nombre}_${new Date().toISOString().slice(0, 10)}.pdf`)
}

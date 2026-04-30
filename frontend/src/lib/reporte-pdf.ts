import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { RectorData, CarreraKpi, BenchmarkCareerSummary } from './types'

// ── Paleta ────────────────────────────────────────────────────────────────
const INDIGO    = [79, 70, 229]  as [number, number, number]
const INDIGO_DK = [49, 46, 129]  as [number, number, number]
const INDIGO_LT = [199, 210, 254] as [number, number, number]
const RED       = [220, 38, 38]  as [number, number, number]
const GREEN     = [16, 185, 129] as [number, number, number]
const AMBER     = [245, 158, 11] as [number, number, number]
const GRAY      = [107, 114, 128] as [number, number, number]
const GRAY_LT   = [241, 245, 249] as [number, number, number]
const WHITE     = [255, 255, 255] as [number, number, number]
const DARK      = [15, 23, 42]   as [number, number, number]

const W = 216  // letter width mm
const H = 279  // letter height mm

function scoreColor(score: number, invert = false): [number, number, number] {
  const high = score >= 0.7
  const low  = score < 0.4
  if (invert) return high ? RED : low ? GREEN : AMBER
  return high ? GREEN : low ? RED : AMBER
}

function scoreLabel(score: number, invert = false): string {
  const high = score >= 0.7
  const low  = score < 0.4
  if (invert) return high ? 'ALTO' : low ? 'BAJO' : 'MEDIO'
  return high ? 'ALTO' : low ? 'BAJO' : 'MEDIO'
}

function semaforo(score: number, invert = false): string {
  const high = score >= 0.7
  const low  = score < 0.4
  if (invert) return high ? '🔴' : low ? '🟢' : '🟡'
  return high ? '🟢' : low ? '🔴' : '🟡'
}

function addPageHeader(doc: jsPDF, title: string, iesNombre: string, pageNum: number, total: number) {
  doc.setFillColor(...INDIGO)
  doc.rect(0, 0, W, 14, 'F')
  doc.setTextColor(...WHITE)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.text('OIA-EE · Observatorio de Indicadores · IA · Empleo · Educación', 8, 9)
  doc.setFont('helvetica', 'normal')
  doc.text(`${title} · ${iesNombre}`, W / 2, 9, { align: 'center' })
  doc.text(`Pág. ${pageNum} / ${total}`, W - 8, 9, { align: 'right' })
}

function addPageFooter(doc: jsPDF, fecha: string) {
  const y = H - 8
  doc.setDrawColor(...INDIGO_LT)
  doc.setLineWidth(0.3)
  doc.line(8, y - 3, W - 8, y - 3)
  doc.setFontSize(6.5)
  doc.setTextColor(...GRAY)
  doc.setFont('helvetica', 'normal')
  doc.text(`Generado: ${fecha} · OIA-EE — Confidencial, uso interno exclusivo`, 8, y)
  doc.text('oia-ee.com', W - 8, y, { align: 'right' })
}

function statBox(doc: jsPDF, x: number, y: number, w: number, h: number, label: string, value: string, color: [number,number,number] = INDIGO) {
  doc.setFillColor(...GRAY_LT)
  doc.roundedRect(x, y, w, h, 2, 2, 'F')
  doc.setFillColor(...color)
  doc.roundedRect(x, y, w, 1.5, 0.5, 0.5, 'F')
  doc.setFontSize(15)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...color)
  doc.text(value, x + w / 2, y + h / 2 + 1, { align: 'center' })
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRAY)
  doc.text(label, x + w / 2, y + h - 4, { align: 'center' })
}

// ── Página 1: Portada ─────────────────────────────────────────────────────
function pagPortada(doc: jsPDF, data: RectorData, fecha: string) {
  // Fondo superior indigo
  doc.setFillColor(...INDIGO_DK)
  doc.rect(0, 0, W, 90, 'F')
  doc.setFillColor(...INDIGO)
  doc.rect(0, 65, W, 35, 'F')

  // Título principal
  doc.setTextColor(...WHITE)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('REPORTE DE DESEMPEÑO ESTRATÉGICO', W / 2, 28, { align: 'center' })
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  const nombre = data.ies.nombre
  doc.text(nombre, W / 2, 48, { align: 'center', maxWidth: 180 })
  if (data.ies.nombre_corto) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text(data.ies.nombre_corto, W / 2, 60, { align: 'center' })
  }

  // Fecha y número
  doc.setFontSize(8)
  doc.setTextColor(199, 210, 254)
  doc.text(`Fecha: ${fecha}`, W / 2, 80, { align: 'center' })
  doc.text('Elaborado por OIA-EE — Observatorio de Impacto IA en Educación y Empleo', W / 2, 87, { align: 'center' })

  // Franja blanca — Stats clave
  const alertasAltas = data.alertas.filter(a => a.severidad === 'alta').length
  const d1Scores = data.carreras.filter(c => c.kpi).map(c => c.kpi!.d1_obsolescencia.score)
  const d2Scores = data.carreras.filter(c => c.kpi).map(c => c.kpi!.d2_oportunidades.score)
  const promD1 = d1Scores.length ? d1Scores.reduce((a, b) => a + b, 0) / d1Scores.length : 0
  const promD2 = d2Scores.length ? d2Scores.reduce((a, b) => a + b, 0) / d2Scores.length : 0
  const carrerasAltoRiesgo = d1Scores.filter(s => s >= 0.7).length

  statBox(doc, 10, 100, 44, 28, 'Carreras monitoreadas', String(data.carreras.length))
  statBox(doc, 60, 100, 44, 28, 'Alertas activas', String(data.alertas.length), alertasAltas > 0 ? RED : GREEN)
  statBox(doc, 110, 100, 44, 28, 'D1 Prom. Obsolescencia', promD1.toFixed(2), scoreColor(promD1, true))
  statBox(doc, 160, 100, 44, 28, 'Carreras alto riesgo', String(carrerasAltoRiesgo), carrerasAltoRiesgo > 0 ? RED : GREEN)

  // Descripción
  doc.setFontSize(9)
  doc.setTextColor(...DARK)
  doc.setFont('helvetica', 'normal')
  const intro = `Este reporte presenta los indicadores estratégicos de la institución en las dimensiones D1 Obsolescencia, D2 Oportunidades, D3 Mercado Laboral y D6 Perfil Estudiantil, calculados con datos de vacantes IA (OCC México), estadísticas IMSS/ENOE y noticias del sector. Fuente: OIA-EE · Ciclo ${new Date().getFullYear()}.`
  const lines = doc.splitTextToSize(intro, W - 28) as string[]
  doc.text(lines, 14, 145)

  // Línea divisoria + contenido del reporte
  doc.setDrawColor(...INDIGO_LT)
  doc.setLineWidth(0.4)
  doc.line(14, 175, W - 14, 175)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...INDIGO)
  doc.text('CONTENIDO DEL REPORTE', 14, 183)
  const contenido = [
    '1. Resumen Ejecutivo — KPIs consolidados por carrera (D1 · D2 · D3 · D6)',
    '2. Análisis de Alertas — Carreras en riesgo alto y recomendaciones prioritarias',
    '3. Tendencias y Proyecciones — Evolución histórica y semáforo predictivo',
  ]
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...DARK)
  contenido.forEach((line, i) => {
    doc.text(`${line}`, 18, 192 + i * 9)
  })

  // Watermark / disclaimer
  doc.setFontSize(7)
  doc.setTextColor(...GRAY)
  doc.text('Confidencial — uso interno exclusivo · Prohibida su reproducción sin autorización de OIA-EE', W / 2, H - 12, { align: 'center' })
}

// ── Página 2: KPIs por carrera ────────────────────────────────────────────
function pagKpis(doc: jsPDF, data: RectorData, fecha: string) {
  doc.addPage()
  addPageHeader(doc, 'KPIs por Carrera', data.ies.nombre_corto ?? data.ies.nombre, 2, 4)
  addPageFooter(doc, fecha)

  // Título sección
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...INDIGO)
  doc.text('Indicadores de Desempeño por Carrera', 14, 25)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRAY)
  doc.text('D1: Obsolescencia (↑ = mayor riesgo IA) · D2: Oportunidades (↑ = mejor) · D3: Mercado laboral (↑ = mejor) · D6: Perfil estudiantil (↑ = mejor)', 14, 31)

  const rows: (string | { content: string; styles: object })[][] = data.carreras.map((c: CarreraKpi) => {
    const d1 = c.kpi?.d1_obsolescencia.score
    const d2 = c.kpi?.d2_oportunidades.score
    const d3 = c.kpi?.d3_mercado?.score
    const d6 = c.kpi?.d6_estudiantil?.score

    return [
      { content: c.nombre, styles: { fontStyle: 'normal' } },
      c.matricula != null ? c.matricula.toLocaleString('es-MX') : '—',
      d1 != null ? d1.toFixed(2) : '—',
      d1 != null ? scoreLabel(d1, true) : '—',
      d2 != null ? d2.toFixed(2) : '—',
      d2 != null ? scoreLabel(d2) : '—',
      d3 != null ? d3.toFixed(2) : '—',
      d6 != null ? d6.toFixed(2) : '—',
    ]
  })

  autoTable(doc, {
    startY: 35,
    head: [['Carrera', 'Matrícula', 'D1', 'Riesgo', 'D2', 'Oport.', 'D3', 'D6']],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: INDIGO, fontSize: 7.5, halign: 'center', textColor: WHITE },
    bodyStyles: { fontSize: 7.5 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 72 },
      1: { cellWidth: 22, halign: 'center' },
      2: { cellWidth: 14, halign: 'center' },
      3: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
      4: { cellWidth: 14, halign: 'center' },
      5: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
      6: { cellWidth: 14, halign: 'center' },
      7: { cellWidth: 14, halign: 'center' },
    },
    margin: { left: 8, right: 8 },
    didParseCell(h) {
      if (h.section !== 'body') return
      if (h.column.index === 3) {
        const v = h.cell.raw as string
        h.cell.styles.textColor = v === 'ALTO' ? RED : v === 'BAJO' ? GREEN : AMBER
      }
      if (h.column.index === 5) {
        const v = h.cell.raw as string
        h.cell.styles.textColor = v === 'ALTO' ? GREEN : v === 'BAJO' ? RED : AMBER
      }
    },
  })

  // Leyenda semáforo
  const lastY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6
  if (lastY < H - 30) {
    const items: [string, [number,number,number]][] = [
      ['D1 ALTO = riesgo elevado de obsolescencia', RED],
      ['D1 BAJO = riesgo controlado', GREEN],
      ['D2 ALTO = alta demanda laboral', GREEN],
      ['D2 BAJO = baja demanda', RED],
    ]
    doc.setFontSize(6.5)
    items.forEach((item, i) => {
      const x = 14 + (i % 2) * 98
      const y2 = lastY + Math.floor(i / 2) * 5.5
      doc.setFillColor(...item[1])
      doc.roundedRect(x, y2 - 2.5, 2.5, 2.5, 0.5, 0.5, 'F')
      doc.setTextColor(...GRAY)
      doc.text(item[0], x + 4, y2)
    })
  }
}

// ── Página 3: Cartera — Matriz Riesgo × Oportunidad ─────────────────────
function pagCartera(doc: jsPDF, data: RectorData, fecha: string) {
  doc.addPage()
  const iesLabel = data.ies.nombre_corto ?? data.ies.nombre
  addPageHeader(doc, 'Cartera de Carreras', iesLabel, 3, 4)
  addPageFooter(doc, fecha)

  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...INDIGO)
  doc.text('Matriz Riesgo × Oportunidad', 14, 25)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRAY)
  doc.text('Clasificación de carreras por D1 (riesgo de obsolescencia) y D2 (oportunidad de empleabilidad)', 14, 31)

  type Q = 'estrella' | 'transformacion' | 'estable' | 'riesgo'
  const buckets: Record<Q, CarreraKpi[]> = { estrella: [], transformacion: [], estable: [], riesgo: [] }
  data.carreras.forEach(c => {
    if (!c.kpi) return
    const d1 = c.kpi.d1_obsolescencia.score
    const d2 = c.kpi.d2_oportunidades.score
    if (d1 < 0.5 && d2 >= 0.5) buckets.estrella.push(c)
    else if (d1 >= 0.5 && d2 >= 0.5) buckets.transformacion.push(c)
    else if (d1 < 0.5 && d2 < 0.5)  buckets.estable.push(c)
    else buckets.riesgo.push(c)
  })

  const QUADS: { key: Q; label: string; sub: string; color: [number,number,number]; bg: [number,number,number]; x: number; y: number }[] = [
    { key: 'estrella',      label: 'Estrella',          sub: 'Bajo riesgo · Alta oportunidad',   color: GREEN,  bg: [236,253,245], x: 14,   y: 38 },
    { key: 'transformacion',label: 'En Transformación', sub: 'Alto riesgo · Alta oportunidad',   color: AMBER,  bg: [255,251,235], x: 118,  y: 38 },
    { key: 'riesgo',        label: 'En Riesgo',         sub: 'Alto riesgo · Baja oportunidad',   color: RED,    bg: [254,242,242], x: 118,  y: 132 },
    { key: 'estable',       label: 'Estable',            sub: 'Bajo riesgo · Baja oportunidad', color: INDIGO, bg: [239,246,255], x: 14,   y: 132 },
  ]

  const QW = 92, QH = 86

  QUADS.forEach(q => {
    doc.setFillColor(...q.bg)
    doc.roundedRect(q.x, q.y, QW, QH, 2, 2, 'F')
    doc.setFillColor(...q.color)
    doc.roundedRect(q.x, q.y, QW, 1.5, 0.5, 0.5, 'F')

    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...q.color)
    doc.text(`${q.label} (${buckets[q.key].length})`, q.x + 4, q.y + 9)
    doc.setFontSize(6.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRAY)
    doc.text(q.sub, q.x + 4, q.y + 15)

    const items = buckets[q.key].slice(0, 8)
    items.forEach((c, i) => {
      const name = c.nombre.length > 34 ? c.nombre.slice(0, 32) + '…' : c.nombre
      const d1 = c.kpi!.d1_obsolescencia.score.toFixed(2)
      const d2 = c.kpi!.d2_oportunidades.score.toFixed(2)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...DARK)
      doc.text(`• ${name}`, q.x + 4, q.y + 22 + i * 7)
      doc.setTextColor(...GRAY)
      doc.setFontSize(6)
      doc.text(`D1:${d1} D2:${d2}`, q.x + QW - 4, q.y + 22 + i * 7, { align: 'right' })
    })
    if (buckets[q.key].length > 8) {
      doc.setFontSize(6.5)
      doc.setTextColor(...GRAY)
      doc.text(`+ ${buckets[q.key].length - 8} más`, q.x + 4, q.y + QH - 5)
    }
  })

  // Etiquetas ejes
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...INDIGO)
  doc.text('← D2 Oportunidad →', 8, 86, { angle: 90 })
  doc.text('← D1 Riesgo →', 14 + QW / 2, H - 68, { align: 'center' })
  doc.text('← D1 Riesgo →', 118 + QW / 2, H - 68, { align: 'center' })
}

// ── Página 4: Alertas + Recomendaciones ──────────────────────────────────
function pagAlertas(doc: jsPDF, data: RectorData, fecha: string) {
  doc.addPage()
  addPageHeader(doc, 'Alertas y Recomendaciones', data.ies.nombre_corto ?? data.ies.nombre, 4, 4)
  addPageFooter(doc, fecha)

  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...INDIGO)
  doc.text('Alertas Activas', 14, 25)

  if (data.alertas.length === 0) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRAY)
    doc.text('No hay alertas activas en este período.', 14, 34)
  } else {
    autoTable(doc, {
      startY: 29,
      head: [['Carrera', 'Tipo', 'Sev.', 'Mensaje']],
      body: data.alertas.map(a => [
        a.carrera_nombre,
        a.tipo.replace('_', ' ').toUpperCase(),
        a.severidad.toUpperCase(),
        a.mensaje ?? a.titulo,
      ]),
      theme: 'grid',
      headStyles: { fillColor: RED, fontSize: 8, textColor: WHITE },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 65 },
        1: { cellWidth: 28, halign: 'center' },
        2: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
        3: { cellWidth: 80 },
      },
      margin: { left: 8, right: 8 },
      didParseCell(h) {
        if (h.section === 'body' && h.column.index === 2) {
          h.cell.styles.textColor = (h.cell.raw as string) === 'ALTA' ? RED : AMBER
        }
      },
    })
  }

  // Recomendaciones
  const afterAlertas = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? 50
  const recY = afterAlertas + 12

  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...INDIGO)
  doc.text('Recomendaciones Prioritarias', 14, recY)

  const d1Scores = data.carreras.filter(c => c.kpi).map(c => ({ nombre: c.nombre, d1: c.kpi!.d1_obsolescencia.score, d2: c.kpi!.d2_oportunidades.score }))
  const altoRiesgo = d1Scores.filter(c => c.d1 >= 0.7).sort((a, b) => b.d1 - a.d1)
  const mejorOp = d1Scores.filter(c => c.d2 >= 0.6).sort((a, b) => b.d2 - a.d2)

  const recomendaciones: string[] = []
  if (altoRiesgo.length > 0) {
    const nombres = altoRiesgo.slice(0, 3).map(c => c.nombre).join(', ')
    recomendaciones.push(`Prioridad ALTA: ${altoRiesgo.length} carrera(s) con D1 ≥ 0.70 (${nombres}). Se recomienda revisar el plan de estudios e incorporar competencias en IA y automatización.`)
  }
  if (mejorOp.length > 0) {
    const nombres = mejorOp.slice(0, 2).map(c => c.nombre).join(', ')
    recomendaciones.push(`Oportunidad de crecimiento: ${nombres} presentan alta demanda laboral (D2 ≥ 0.60). Considerar ampliar matrícula y fortalecer convenios empresariales.`)
  }
  recomendaciones.push('Se recomienda programar una revisión trimestral de estos indicadores con el equipo de planeación institucional para ajustar estrategias oportunamente.')

  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  let rY = recY + 8
  recomendaciones.forEach((rec, i) => {
    doc.setFillColor(...GRAY_LT)
    const lines = doc.splitTextToSize(`${i + 1}. ${rec}`, W - 28) as string[]
    const bH = lines.length * 5 + 6
    doc.roundedRect(10, rY, W - 20, bH, 2, 2, 'F')
    doc.setFillColor(...INDIGO)
    doc.roundedRect(10, rY, 3, bH, 1, 1, 'F')
    doc.setTextColor(...DARK)
    doc.text(lines, 17, rY + 5)
    rY += bH + 4
  })

  // Firma / contacto
  if (rY < H - 40) {
    rY += 8
    doc.setFillColor(...INDIGO_LT)
    doc.roundedRect(10, rY, W - 20, 22, 3, 3, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...INDIGO_DK)
    doc.text('OIA-EE — Observatorio de Impacto IA en Educación y Empleo', W / 2, rY + 7, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.text('Para consultas sobre este reporte o para agendar una sesión ejecutiva, contacte a su ejecutivo de cuenta OIA-EE.', W / 2, rY + 13, { align: 'center' })
    doc.setTextColor(...INDIGO)
    doc.text('oia-ee.com · sam.economia@gmail.com', W / 2, rY + 19, { align: 'center' })
  }
}

// ── Página 5: Benchmarks Globales ────────────────────────────────────────
function pagBenchmarks(
  doc: jsPDF,
  data: RectorData,
  benchmarkMap: Record<string, BenchmarkCareerSummary>,
  fecha: string,
  pageNum: number,
  totalPages: number,
) {
  doc.addPage()
  addPageHeader(doc, 'Benchmarks Globales', data.ies.nombre_corto ?? data.ies.nombre, pageNum, totalPages)
  addPageFooter(doc, fecha)

  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...INDIGO)
  doc.text('Urgencia Curricular Global', 14, 25)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRAY)
  doc.text('Convergencia de 5 fuentes internacionales (WEF · McKinsey · CEPAL · Frey-Osborne · Anthropic) sobre la exposición de habilidades a la IA', 14, 31)

  const carrerasConBench = data.carreras
    .filter(c => c.benchmark_slug && benchmarkMap[c.benchmark_slug])
    .map(c => ({ ...c, bench: benchmarkMap[c.benchmark_slug!]! }))
    .sort((a, b) => b.bench.urgencia_curricular - a.bench.urgencia_curricular)

  if (carrerasConBench.length === 0) {
    doc.setFontSize(9)
    doc.setTextColor(...GRAY)
    doc.text('No hay datos de benchmarks globales para las carreras de esta institución.', 14, 40)
    return
  }

  const rows = carrerasConBench.map(c => {
    const u = c.bench.urgencia_curricular
    const urgLabel = u >= 60 ? 'ALTA' : u >= 30 ? 'MODERADA' : 'BAJA'
    return [
      { content: c.nombre, styles: { fontStyle: 'normal' as const } },
      { content: `${u}/100`, styles: { halign: 'center' as const } },
      urgLabel,
      { content: String(c.bench.skills_declining), styles: { halign: 'center' as const } },
      { content: String(c.bench.skills_growing), styles: { halign: 'center' as const } },
      { content: String(c.bench.skills_mixed), styles: { halign: 'center' as const } },
      { content: String(c.bench.total_skills), styles: { halign: 'center' as const } },
    ]
  })

  autoTable(doc, {
    startY: 35,
    head: [['Carrera', 'Urgencia', 'Nivel', 'Declining ↓', 'Growing ↑', 'Mixed', 'Total']],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: INDIGO, fontSize: 7.5, halign: 'center', textColor: WHITE },
    bodyStyles: { fontSize: 7.5 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 72 },
      1: { cellWidth: 22, halign: 'center' },
      2: { cellWidth: 24, halign: 'center', fontStyle: 'bold' },
      3: { cellWidth: 22, halign: 'center' },
      4: { cellWidth: 22, halign: 'center' },
      5: { cellWidth: 18, halign: 'center' },
      6: { cellWidth: 14, halign: 'center' },
    },
    margin: { left: 8, right: 8 },
    didParseCell(h) {
      if (h.section !== 'body' || h.column.index !== 2) return
      const v = h.cell.raw as string
      h.cell.styles.textColor = v === 'ALTA' ? RED : v === 'MODERADA' ? AMBER : GREEN
    },
  })

  const lastY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
  doc.setFontSize(7)
  doc.setTextColor(...GRAY)
  doc.text('Urgencia curricular = % skills en declive × consenso promedio de fuentes (0–100). Alta ≥ 60 · Moderada 30–59 · Baja < 30', 14, lastY)
}

// ── Export principal ──────────────────────────────────────────────────────
export function generarReporteRector(
  data: RectorData,
  benchmarkMap: Record<string, BenchmarkCareerSummary> = {},
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })
  const fecha = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })
  const hasBench = data.carreras.some(c => c.benchmark_slug && benchmarkMap[c.benchmark_slug ?? ''])
  const totalPages = hasBench ? 5 : 4

  pagPortada(doc, data, fecha)
  pagKpis(doc, data, fecha)
  pagCartera(doc, data, fecha)
  pagAlertas(doc, data, fecha)
  if (hasBench) pagBenchmarks(doc, data, benchmarkMap, fecha, 5, totalPages)

  const nombre = `reporte-${data.ies.nombre_corto ?? data.ies.id}-${new Date().toISOString().slice(0, 10)}.pdf`
  doc.save(nombre)
}

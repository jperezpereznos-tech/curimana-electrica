import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatCurrency, formatDate } from '@/lib/utils'

interface ConceptBreakdownItem {
  name: string
  amount: number
}

interface TariffTierItem {
  min_kwh: number
  max_kwh: number | null
  price_per_kwh: number
  order_index: number
}

interface ReceiptPdfData {
  customers?: {
    supply_number?: string | null
    full_name?: string | null
    address?: string | null
    sectors?: { id: string; name: string } | null
    tariffs?: { name?: string | null; connection_type?: string | null } | null
  } | null
  billing_periods: { name: string } | null
  receipt_number: string | number
  total_amount: number
  due_date: string
  issue_date?: string | null
  energy_amount: number
  fixed_charges: number
  previous_debt: number | null
  subtotal: number
  previous_reading?: number | null
  current_reading?: number | null
  consumption_kwh?: number | null
  period_start?: string | null
  period_end?: string | null
  status?: string | null
  readings?: { reading_date?: string | null } | null
  tariff_tiers?: TariffTierItem[]
  municipality_config?: { ruc?: string; name?: string; om_number?: string | null; logo_url?: string | null } | null
  conceptsBreakdown?: ConceptBreakdownItem[]
}

interface PaymentVoucherData {
  paymentId: string
  reference: string
  paymentDate: string
  amount: number
  receivedAmount: number
  changeAmount: number
  receiptNumber: string | number
  receiptTotal: number
  receiptPaidAfter: number
  receiptStatus: string
  periodName: string
  customer: { supplyNumber: string; fullName: string; address?: string | null; sectorName?: string | null }
  municipality_config?: { ruc?: string; name?: string } | null
  cashierName?: string | null
}

const COLOR_GREEN_BG = [198, 224, 180] as const
const COLOR_GREEN_BORDER = [130, 180, 100] as const
const COLOR_YELLOW_BG = [255, 204, 0] as const
const COLOR_DARK_GREEN = [15, 89, 52] as const
const COLOR_RED = [211, 0, 0] as const
const COLOR_ORANGE_BORDER = [196, 154, 23] as const
const COLOR_CREAM_BG = [253, 245, 230] as const
const COLOR_BLUE_HEADER = [0, 102, 204] as const
const COLOR_GRAY_BORDER = [166, 166, 166] as const
const COLOR_LIGHT_BLUE_BG = [218, 238, 243] as const

export class PdfService {
  generateReceiptPdf(data: ReceiptPdfData) {
    const {
      customers, billing_periods, receipt_number, total_amount, due_date,
      issue_date, energy_amount, fixed_charges, previous_debt, subtotal,
      previous_reading, current_reading, consumption_kwh,
      period_start, period_end, status, readings, tariff_tiers,
      municipality_config, conceptsBreakdown,
    } = data

    const ruc = municipality_config?.ruc || '20232953421'
    const muniName = municipality_config?.name || 'Municipalidad Distrital de Curimana'
    const omNumber = municipality_config?.om_number || 'OM N° 006-2019-MDC'
    const supplyNumber = customers?.supply_number || ''
    const customerName = customers?.full_name || ''
    const customerAddress = customers?.address || ''
    const sectorName = customers?.sectors?.name || ''
    const tariffName = customers?.tariffs?.name || 'BTSB-RESIDENCIAL'
    const connectionType = customers?.tariffs?.connection_type || 'monofásico'
    const periodName = billing_periods?.name || ''
    const tiers = tariff_tiers || []

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageW = 210
    const margin = 10
    const contentW = pageW - margin * 2
    const leftW = 95
    const rightW = contentW - leftW - 5
    const leftX = margin
    const rightX = margin + leftW + 5

    const drawBox = (x: number, y: number, w: number, h: number, title?: string, opts?: { bgColor?: readonly number[]; borderColor?: readonly number[] }) => {
      const border = opts?.borderColor || COLOR_GRAY_BORDER
      doc.setDrawColor(border[0], border[1], border[2])
      doc.setLineWidth(0.3)
      if (opts?.bgColor) {
        doc.setFillColor(opts.bgColor[0], opts.bgColor[1], opts.bgColor[2])
        doc.rect(x, y, w, h, 'FD')
      } else {
        doc.rect(x, y, w, h)
      }
      if (title) {
        const tw = doc.getTextWidth(title) + 12
        const tx = x + (w - tw) / 2
        doc.setFillColor(COLOR_GREEN_BG[0], COLOR_GREEN_BG[1], COLOR_GREEN_BG[2])
        doc.setDrawColor(COLOR_GRAY_BORDER[0], COLOR_GRAY_BORDER[1], COLOR_GRAY_BORDER[2])
        doc.rect(tx, y - 4, tw, 8, 'FD')
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 0, 0)
        doc.text(title, x + w / 2, y - 0.5, { align: 'center' })
      }
    }

    let y = margin

    // ── HEADER ──
    const logoPlaceholder = '[ ESCUDO ]'
    doc.setFillColor(255, 255, 255)
    doc.rect(leftX, y, 30, 30, 'S')

    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(153, 153, 153)
    doc.text(logoPlaceholder, leftX + 15, y + 16, { align: 'center' })

    const centerX = leftX + 35
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(51, 51, 51)
    doc.text('Municipalidad Distrital de', centerX + 30, y + 6)

    doc.setFontSize(26)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(COLOR_DARK_GREEN[0], COLOR_DARK_GREEN[1], COLOR_DARK_GREEN[2])
    doc.text('CURIMANA', centerX + 30, y + 17)

    doc.setFontSize(12)
    doc.setTextColor(COLOR_DARK_GREEN[0], COLOR_DARK_GREEN[1], COLOR_DARK_GREEN[2])
    doc.text(`RUC: ${ruc}`, centerX + 30, y + 24)

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(85, 85, 85)
    doc.text(omNumber, centerX + 30, y + 29)

    // Nº Suministro box (yellow)
    const sumBoxX = rightX
    const sumBoxW = rightW
    doc.setFillColor(COLOR_YELLOW_BG[0], COLOR_YELLOW_BG[1], COLOR_YELLOW_BG[2])
    doc.setDrawColor(COLOR_YELLOW_BG[0], COLOR_YELLOW_BG[1], COLOR_YELLOW_BG[2])
    doc.rect(sumBoxX, y, sumBoxW, 10, 'FD')
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text('Nº SUMINISTRO', sumBoxX + sumBoxW / 2, y + 7, { align: 'center' })

    doc.setDrawColor(COLOR_YELLOW_BG[0], COLOR_YELLOW_BG[1], COLOR_YELLOW_BG[2])
    doc.rect(sumBoxX, y + 10, sumBoxW, 12, 'S')
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text(supplyNumber, sumBoxX + sumBoxW / 2, y + 18, { align: 'center' })

    y += 36

    // ── LEFT COLUMN ──

    // Box: DATOS DEL CLIENTE
    const clientBoxY = y
    const clientContentH = 30
    drawBox(leftX, clientBoxY, leftW, clientContentH, 'DATOS DEL CLIENTE')
    let cy = clientBoxY + 6
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'bold')
    doc.text('NOMBRE:', leftX + 4, cy)
    doc.setFont('helvetica', 'normal')
    doc.text(customerName, leftX + 26, cy)
    cy += 8
    doc.setFont('helvetica', 'bold')
    doc.text('DIRECCIÓN:', leftX + 4, cy)
    doc.setFont('helvetica', 'normal')
    doc.text(customerAddress, leftX + 30, cy)
    cy += 8
    doc.setFont('helvetica', 'bold')
    doc.text('SECTOR:', leftX + 4, cy)
    doc.setFont('helvetica', 'normal')
    doc.text(sectorName, leftX + 22, cy)

    y = clientBoxY + clientContentH + 5

    // Box: DATOS TÉCNICOS
    const techBoxY = y
    const tierRows = Math.max(tiers.length, 1)
    const techContentH = 16 + tierRows * 6
    drawBox(leftX, techBoxY, leftW, techContentH, 'DATOS TÉCNICOS')
    cy = techBoxY + 6
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text(`TARIFA: ${tariffName} - ${connectionType.toUpperCase()}`, leftX + leftW / 2, cy, { align: 'center' })
    cy += 8

    if (tiers.length > 0) {
      const sorted = [...tiers].sort((a, b) => a.order_index - b.order_index)
      for (const tier of sorted) {
        const from = tier.min_kwh
        const toLabel = tier.max_kwh != null ? `${tier.max_kwh} kWh` : '+ kWh'
        const price = `S/ ${tier.price_per_kwh.toFixed(2)}`
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.text('DE:', leftX + 15, cy)
        doc.text(`${from} A ${toLabel}:`, leftX + 25, cy)
        doc.text(price, leftX + leftW - 15, cy, { align: 'right' })
        cy += 6
      }
    } else {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text('Sin tramos tarifarios', leftX + leftW / 2, cy, { align: 'center' })
    }

    y = techBoxY + techContentH + 5

    // Box: DETALLE DEL CONSUMO
    const consumoBoxY = y
    const consumoContentH = 48
    drawBox(leftX, consumoBoxY, leftW, consumoContentH, 'DETALLE DEL CONSUMO')
    cy = consumoBoxY + 6
    const consumoLabelX = leftX + 4
    const consumoValX = leftX + 50
    const consumoDateX = leftX + leftW - 4

    const readingDate = readings?.reading_date || period_end
    const prevReadingDate = period_start

    doc.setFontSize(9)

    doc.setFont('helvetica', 'bold')
    doc.text('LECTURA ACTUAL', consumoLabelX, cy)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(COLOR_RED[0], COLOR_RED[1], COLOR_RED[2])
    doc.text(String(current_reading ?? '-'), consumoValX, cy)
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.text(readingDate ? formatDate(readingDate) : '', consumoDateX, cy, { align: 'right' })

    cy += 10
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('LECTURA ANTERIOR', consumoLabelX, cy)
    doc.setTextColor(COLOR_RED[0], COLOR_RED[1], COLOR_RED[2])
    doc.text(String(previous_reading ?? '-'), consumoValX, cy)
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.text(prevReadingDate ? formatDate(prevReadingDate) : '', consumoDateX, cy, { align: 'right' })

    cy += 10
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('CONSUMO FACTURADO', consumoLabelX, cy)
    doc.setFont('helvetica', 'normal')
    doc.text(consumption_kwh != null ? String(consumption_kwh) : '-', consumoValX, cy)

    cy += 10
    doc.setFont('helvetica', 'bold')
    doc.text('PRECIO UNIT. X kWh', consumoLabelX, cy)
    doc.setFont('helvetica', 'normal')
    const unitPrice = tiers.length > 0 ? `S/ ${tiers[0].price_per_kwh.toFixed(2)}` : '-'
    doc.text(unitPrice, consumoValX, cy)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.text('kW.h', consumoDateX, cy, { align: 'right' })

    y = consumoBoxY + consumoContentH + 5

    // Box: MENSAJES AL CLIENTE
    const msgBoxY = y
    const msgContentH = 20
    drawBox(leftX, msgBoxY, leftW, msgContentH, 'MENSAJES AL CLIENTE')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    doc.text('Este recibo corresponde a su consumo durante', leftX + leftW / 2, msgBoxY + 10, { align: 'center' })
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text(`el mes de ${periodName}`, leftX + leftW / 2, msgBoxY + 16, { align: 'center' })

    y = msgBoxY + msgContentH + 5

    // Box: MES FACTURADO (left column)
    const mesFactLeftY = y
    doc.setFillColor(COLOR_GREEN_BG[0], COLOR_GREEN_BG[1], COLOR_GREEN_BG[2])
    doc.setDrawColor(COLOR_GRAY_BORDER[0], COLOR_GRAY_BORDER[1], COLOR_GRAY_BORDER[2])
    doc.rect(leftX, mesFactLeftY, leftW, 10, 'FD')
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text('MES FACTURADO', leftX + 4, mesFactLeftY + 6.5)
    doc.text(periodName, leftX + leftW - 4, mesFactLeftY + 6.5, { align: 'right' })

    const mesFactContentY = mesFactLeftY + 10
    doc.setDrawColor(COLOR_GRAY_BORDER[0], COLOR_GRAY_BORDER[1], COLOR_GRAY_BORDER[2])
    doc.rect(leftX, mesFactContentY, leftW, 24, 'S')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    const periodRange = `${formatDate(period_start)} AL ${formatDate(period_end)}`
    doc.text(`DEL: ${periodRange}`, leftX + leftW / 2, mesFactContentY + 7, { align: 'center' })
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('TOTAL', leftX + 15, mesFactContentY + 18)
    doc.setFontSize(13)
    doc.text(formatCurrency(total_amount), leftX + leftW - 8, mesFactContentY + 18, { align: 'right' })

    y = mesFactContentY + 24 + 5

    // Yellow banner
    doc.setFillColor(COLOR_YELLOW_BG[0], COLOR_YELLOW_BG[1], COLOR_YELLOW_BG[2])
    doc.rect(leftX, y, leftW, 10, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text('¡SI USTED YA PAGÓ, OMITA ESTE RECIBO!', leftX + leftW / 2, y + 6, { align: 'center' })

    // ── RIGHT COLUMN ──
    let ry = margin + 36

    // MES FACTURADO header (right)
    doc.setFillColor(COLOR_GREEN_BG[0], COLOR_GREEN_BG[1], COLOR_GREEN_BG[2])
    doc.setDrawColor(COLOR_GRAY_BORDER[0], COLOR_GRAY_BORDER[1], COLOR_GRAY_BORDER[2])
    doc.rect(rightX, ry, rightW, 10, 'FD')
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text('MES FACTURADO', rightX + 4, ry + 6.5)
    doc.text(periodName, rightX + rightW - 4, ry + 6.5, { align: 'right' })
    ry += 14

    // Box: DETALLE FACTURACIÓN
    const factBoxY = ry
    const factRows = 1 + (conceptsBreakdown?.length || 1) + 2
    const factContentH = 10 + factRows * 6.5
    drawBox(rightX, factBoxY, rightW, factContentH, 'DETALLE FACTURACIÓN')
    let fy = factBoxY + 7

    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text('CONCEPTO', rightX + 4, fy)
    doc.text('IMPORTE S/', rightX + rightW - 4, fy, { align: 'right' })
    fy += 2
    doc.setDrawColor(COLOR_GRAY_BORDER[0], COLOR_GRAY_BORDER[1], COLOR_GRAY_BORDER[2])
    doc.line(rightX + 3, fy, rightX + rightW - 3, fy)
    fy += 5

    doc.setFont('helvetica', 'normal')
    doc.text('Energía Activa', rightX + 4, fy)
    doc.text(formatCurrency(energy_amount).replace('S/', '').trim(), rightX + rightW - 4, fy, { align: 'right' })
    fy += 6.5

    if (conceptsBreakdown && conceptsBreakdown.length > 0) {
      for (const c of conceptsBreakdown) {
        doc.text(c.name, rightX + 4, fy)
        doc.text(formatCurrency(c.amount).replace('S/', '').trim(), rightX + rightW - 4, fy, { align: 'right' })
        fy += 6.5
      }
    } else {
      doc.text('Cargos Fijos y Otros', rightX + 4, fy)
      doc.text(formatCurrency(fixed_charges).replace('S/', '').trim(), rightX + rightW - 4, fy, { align: 'right' })
      fy += 6.5
    }

    ry = factBoxY + factContentH + 5

    // Subtotal box
    doc.setDrawColor(COLOR_GRAY_BORDER[0], COLOR_GRAY_BORDER[1], COLOR_GRAY_BORDER[2])
    doc.rect(rightX, ry, rightW, 10, 'S')
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('SUB TOTAL :', rightX + 4, ry + 6.5)
    doc.text(formatCurrency(subtotal), rightX + rightW - 8, ry + 6.5, { align: 'right' })
    ry += 14

    // Deuda anterior box
    doc.rect(rightX, ry, rightW, 10, 'S')
    doc.setFontSize(9)
    doc.text('DEUDAS ANTERIORES S/', rightX + 4, ry + 6.5)
    doc.text(formatCurrency(previous_debt ?? 0), rightX + rightW - 8, ry + 6.5, { align: 'right' })
    ry += 14

    // Total a Pagar box (orange border, cream bg)
    doc.setDrawColor(COLOR_ORANGE_BORDER[0], COLOR_ORANGE_BORDER[1], COLOR_ORANGE_BORDER[2])
    doc.setLineWidth(0.5)
    doc.setFillColor(COLOR_CREAM_BG[0], COLOR_CREAM_BG[1], COLOR_CREAM_BG[2])
    doc.rect(rightX, ry, rightW, 14, 'FD')
    doc.setLineWidth(0.3)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('TOTAL A PAGAR :', rightX + 4, ry + 9)
    doc.setFontSize(13)
    doc.text(formatCurrency(total_amount), rightX + rightW - 8, ry + 9, { align: 'right' })
    ry += 19

    // Dates table
    doc.setFillColor(COLOR_LIGHT_BLUE_BG[0], COLOR_LIGHT_BLUE_BG[1], COLOR_LIGHT_BLUE_BG[2])
    doc.setDrawColor(COLOR_GRAY_BORDER[0], COLOR_GRAY_BORDER[1], COLOR_GRAY_BORDER[2])
    const dateColW = rightW / 2
    doc.rect(rightX, ry, dateColW, 10, 'FD')
    doc.rect(rightX + dateColW, ry, dateColW, 10, 'FD')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text('FECHA EMISIÓN', rightX + dateColW / 2, ry + 6, { align: 'center' })
    doc.text('ULTIMO DÍA DE PAGO', rightX + dateColW + dateColW / 2, ry + 6, { align: 'center' })

    const dateDataRowY = ry + 10
    doc.setFillColor(255, 255, 255)
    doc.rect(rightX, dateDataRowY, dateColW, 12, 'FD')
    doc.rect(rightX + dateColW, dateDataRowY, dateColW, 12, 'FD')
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text(issue_date ? formatDate(issue_date) : '-', rightX + dateColW / 2, dateDataRowY + 7.5, { align: 'center' })
    doc.setTextColor(COLOR_RED[0], COLOR_RED[1], COLOR_RED[2])
    doc.text(formatDate(due_date), rightX + dateColW + dateColW / 2, dateDataRowY + 7.5, { align: 'center' })
    doc.setTextColor(0, 0, 0)
    ry = dateDataRowY + 12 + 5

    // Estado de suministro box
    doc.setDrawColor(COLOR_GRAY_BORDER[0], COLOR_GRAY_BORDER[1], COLOR_GRAY_BORDER[2])
    doc.rect(rightX, ry, rightW, 16, 'S')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    const statusLabel = status === 'paid' ? 'PAGADO' : status === 'cancelled' ? 'ANULADO' : status === 'partial' ? 'PAGO PARCIAL' : status === 'overdue' ? 'VENCIDO' : 'PENDIENTE'
    doc.text('ESTADO DE', rightX + 4, ry + 5)
    doc.text('SUMINISTRO:', rightX + 4, ry + 10)
    doc.setFont('helvetica', 'normal')
    doc.text(statusLabel, rightX + 35, ry + 10)
    ry += 20

    // Referencia box
    doc.setFillColor(COLOR_GREEN_BG[0], COLOR_GREEN_BG[1], COLOR_GREEN_BG[2])
    doc.setDrawColor(COLOR_GRAY_BORDER[0], COLOR_GRAY_BORDER[1], COLOR_GRAY_BORDER[2])
    doc.rect(rightX, ry, rightW, 8, 'FD')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text('REFERENCIA DE MESES ANTERIORES', rightX + rightW / 2, ry + 5.5, { align: 'center' })

    const refContentY = ry + 8
    doc.setFillColor(255, 255, 255)
    doc.rect(rightX, refContentY, rightW, 14, 'FD')
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    doc.text('¡REALICE SUS PAGOS PUNTUALES Y EVITE LOS CORTES!', rightX + rightW / 2, refContentY + 8, { align: 'center' })

    // Footer
    doc.setFontSize(6)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(130, 130, 130)
    doc.text('Documento generado por Sistema Eléctrico Municipal — Municipalidad Distrital de Curimana', pageW / 2, 290, { align: 'center' })

    doc.save(`recibo_${supplyNumber || 'unknown'}_${(periodName || 'periodo').replace(/ /g, '_')}.pdf`)
  }

  generatePaymentVoucherPdf(data: PaymentVoucherData) {
    const {
      reference, paymentDate, amount, receivedAmount, changeAmount,
      receiptNumber, receiptTotal, receiptPaidAfter, receiptStatus,
      periodName, customer, municipality_config, cashierName,
    } = data

    const ruc = municipality_config?.ruc || '20232953421'
    const municipalityName = municipality_config?.name || 'MUNICIPALIDAD DE CURIMANA'

    const doc = new jsPDF()
    const primaryColor = [0, 102, 204]

    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.rect(0, 0, 210, 40, 'F')

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(22)
    doc.text(municipalityName, 15, 20)
    doc.setFontSize(10)
    doc.text('SISTEMA ELÉCTRICO MUNICIPAL', 15, 28)
    doc.text(`RUC: ${ruc}`, 15, 34)

    doc.setFontSize(16)
    doc.text('COMPROBANTE DE PAGO', 140, 20)
    doc.setFontSize(10)
    doc.text(`Ref: ${reference}`, 140, 28)
    doc.text(`Fecha: ${formatDate(paymentDate)}`, 140, 34)

    doc.setTextColor(0, 0, 0)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('DATOS DEL CLIENTE', 15, 50)
    doc.line(15, 52, 195, 52)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(`Suministro: ${customer.supplyNumber}`, 15, 60)
    doc.text(`Cliente: ${customer.fullName}`, 15, 66)
    if (customer.address) doc.text(`Dirección: ${customer.address}`, 15, 72)
    if (customer.sectorName) doc.text(`Sector: ${customer.sectorName}`, 15, 78)

    doc.setFont('helvetica', 'bold')
    doc.text('DETALLE DEL PAGO', 15, customer.address || customer.sectorName ? 88 : 80)
    const tableStartY = customer.address || customer.sectorName ? 92 : 84

    const statusLabel = receiptStatus === 'paid' ? 'PAGADO' : receiptStatus === 'partial' ? 'PAGO PARCIAL' : receiptStatus

    const bodyRows: string[][] = [
      ['Recibo N°', String(receiptNumber)],
      ['Periodo', periodName],
      ['Total del Recibo', formatCurrency(receiptTotal).replace('S/ ', '')],
      ['Monto Pagado', formatCurrency(amount).replace('S/ ', '')],
      ['Total Pagado Acumulado', formatCurrency(receiptPaidAfter).replace('S/ ', '')],
      ['Estado del Recibo', statusLabel],
      ['Efectivo Recibido', formatCurrency(receivedAmount).replace('S/ ', '')],
      ['Vuelto', formatCurrency(changeAmount).replace('S/ ', '')],
    ]

    if (cashierName) {
      bodyRows.push(['Cajero', cashierName])
    }

    autoTable(doc, {
      startY: tableStartY,
      head: [['Descripción', 'Detalle']],
      body: bodyRows,
      theme: 'striped',
      headStyles: { fillColor: primaryColor as unknown as number },
      columnStyles: {
        0: { fontStyle: 'bold' },
        1: { halign: 'right' },
      },
    })

    const finalY = (doc as unknown as Record<string, { finalY: number }>).lastAutoTable.finalY + 15

    if (receiptStatus === 'partial') {
      const remainingOnReceipt = Math.round((receiptTotal - receiptPaidAfter) * 100) / 100
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(180, 80, 0)
      doc.text(`SALDO PENDIENTE: ${formatCurrency(remainingOnReceipt)}`, 15, finalY)
      doc.setTextColor(0, 0, 0)
    }

    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(100, 100, 100)
    const footerY = 280
    doc.text('Comprobante de pago — Sistema Eléctrico Municipal — Municipalidad de Curimana.', 105, footerY, { align: 'center' })
    doc.text('Conserve este documento como constancia de su pago.', 105, footerY + 5, { align: 'center' })

    doc.save(`comprobante_${customer.supplyNumber}_${reference}.pdf`)
  }
}

export const pdfService = new PdfService()

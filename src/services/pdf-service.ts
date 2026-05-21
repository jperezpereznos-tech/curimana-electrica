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

export class PdfService {
  generateReceiptPdf(data: ReceiptPdfData) {
    const { customers, billing_periods, receipt_number, total_amount, due_date, energy_amount, fixed_charges, previous_debt, subtotal, municipality_config, conceptsBreakdown } = data

    const ruc = municipality_config?.ruc || '20123456789'
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
    doc.text(`RECIBO N° ${receipt_number}`, 140, 25)

    doc.setTextColor(0, 0, 0)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('DATOS DEL SUMINISTRO', 15, 50)
    doc.line(15, 52, 195, 52)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(`Suministro: ${customers?.supply_number || ''}`, 15, 60)
    doc.text(`Cliente: ${customers?.full_name || ''}`, 15, 66)
    doc.text(`Dirección: ${customers?.address || ''}`, 15, 72)
    doc.text(`Sector: ${customers?.sectors?.name || ''}`, 15, 78)

    doc.text(`Periodo: ${billing_periods?.name || ''}`, 140, 60)
    doc.text(`Vencimiento: ${formatDate(due_date)}`, 140, 66)

    doc.setFont('helvetica', 'bold')
    doc.text('DETALLE DE CONSUMO Y CARGOS', 15, 90)

    const bodyRows: string[][] = [
      ['Consumo de Energía', formatCurrency(energy_amount).replace('S/ ', '')],
    ]

    if (conceptsBreakdown && conceptsBreakdown.length > 0) {
      for (const c of conceptsBreakdown) {
        bodyRows.push([c.name, formatCurrency(c.amount).replace('S/ ', '')])
      }
    } else {
      bodyRows.push(['Cargos Fijos y Otros', formatCurrency(fixed_charges).replace('S/ ', '')])
    }

    bodyRows.push(['Subtotal del Mes', formatCurrency(subtotal).replace('S/ ', '')])
    bodyRows.push(['Deuda Anterior', formatCurrency(previous_debt ?? 0).replace('S/ ', '')])

    autoTable(doc, {
      startY: 94,
      head: [['Descripción', 'Importe (S/)']],
      body: bodyRows,
      theme: 'striped',
      headStyles: { fillColor: primaryColor as unknown as number },
      columnStyles: {
        1: { halign: 'right' }
      }
    })

    const finalY = (doc as unknown as Record<string, { finalY: number }>).lastAutoTable.finalY + 10
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('TOTAL A PAGAR:', 120, finalY)
    doc.text(formatCurrency(total_amount), 170, finalY, { align: 'right' })

    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(100, 100, 100)
    const footerY = 280
    doc.text('Este documento es un comprobante de facturación interna de la Municipalidad de Curimana.', 105, footerY, { align: 'center' })
    doc.text('Si usted ya realizó el pago, por favor omita este recibo.', 105, footerY + 5, { align: 'center' })

    doc.save(`recibo_${customers?.supply_number || 'unknown'}_${(billing_periods?.name || 'periodo').replace(' ', '_')}.pdf`)
  }

  generatePaymentVoucherPdf(data: PaymentVoucherData) {
    const {
      reference, paymentDate, amount, receivedAmount, changeAmount,
      receiptNumber, receiptTotal, receiptPaidAfter, receiptStatus,
      periodName, customer, municipality_config, cashierName,
    } = data

    const ruc = municipality_config?.ruc || '20123456789'
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

export function getPdfService() { return new PdfService() }
export const pdfService = new PdfService()

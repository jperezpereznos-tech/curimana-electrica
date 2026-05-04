import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatCurrency, formatDate } from '@/lib/utils'

export class PdfService {
  /**
   * Genera el PDF del recibo eléctrico.
   */
  generateReceiptPdf(data: any) {
    const { customers, billing_periods, receipt_number, total_amount, due_date, energy_amount, fixed_charges, igv, previous_debt, municipality_config } = data

    const ruc = municipality_config?.ruc || '20123456789'
    const municipalityName = municipality_config?.name || 'MUNICIPALIDAD DE CURIMANA'
    
    const doc = new jsPDF()
    const primaryColor = [0, 102, 204] // Azul municipal

    // Header
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

    // Datos del Cliente
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
    doc.text(`Sector: ${customers?.sector || ''}`, 15, 78)

    doc.text(`Periodo: ${billing_periods.name}`, 140, 60)
    doc.text(`Vencimiento: ${formatDate(due_date)}`, 140, 66)

    // Detalle de Consumo
    doc.setFont('helvetica', 'bold')
    doc.text('DETALLE DE CONSUMO Y CARGOS', 15, 90)
    
    autoTable(doc, {
      startY: 94,
      head: [['Descripción', 'Importe (S/)']],
      body: [
        ['Consumo de Energía', formatCurrency(energy_amount).replace('S/ ', '')],
        ['Cargos Fijos y Otros', formatCurrency(fixed_charges).replace('S/ ', '')],
        ['IGV (18%)', formatCurrency(igv || 0).replace('S/ ', '')],
        ['Deuda Anterior', formatCurrency(previous_debt).replace('S/ ', '')],
      ],
      theme: 'striped',
      headStyles: { fillColor: primaryColor as any },
      columnStyles: { 1: { halign: 'right' } }
    })

    // Total
    const finalY = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('TOTAL A PAGAR:', 120, finalY)
    doc.text(formatCurrency(total_amount), 170, finalY, { align: 'right' })

    // Footer
    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(100, 100, 100)
    const footerY = 280
    doc.text('Este documento es un comprobante de facturación interna de la Municipalidad de Curimana.', 105, footerY, { align: 'center' })
    doc.text('Si usted ya realizó el pago, por favor omita este recibo.', 105, footerY + 5, { align: 'center' })

    // Save
    doc.save(`recibo_${customers?.supply_number || 'unknown'}_${(billing_periods?.name || 'periodo').replace(' ', '_')}.pdf`)
  }
}

export const pdfService = new PdfService()

import './receipt-print-layout.css'
import { formatCurrency, formatDate } from '@/lib/utils'

interface TariffTier {
  min_kwh: number
  max_kwh: number | null
  price_per_kwh: number
  order_index?: number
}

interface ConceptItem {
  name: string
  amount: number
}

interface PreviousReceiptRef {
  periodName: string
  totalAmount: number
  status: string
}

export interface ReceiptPrintLayoutProps {
  supplyNumber: string
  customerName: string
  customerAddress: string
  sectorName: string
  tariffName: string
  connectionType: string
  tariffTiers: TariffTier[]
  currentReading: number | null
  previousReading: number | null
  consumptionKwh: number | null
  readingDate: string | null
  previousReadingDate: string | null
  periodName: string
  periodStart: string | null
  periodEnd: string | null
  energyAmount: number
  conceptsBreakdown: ConceptItem[]
  subtotal: number
  previousDebt: number
  totalAmount: number
  issueDate: string | null
  dueDate: string
  status: string | null
  municipalityConfig?: {
    ruc?: string
    name?: string
    om_number?: string | null
    logo_url?: string | null
  } | null
  previousReceipts?: PreviousReceiptRef[]
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'ACTIVO',
  paid: 'PAGADO',
  partial: 'PAGO PARCIAL',
  overdue: 'VENCIDO',
  cancelled: 'ANULADO',
}

export function ReceiptPrintLayout(props: ReceiptPrintLayoutProps) {
  const {
    supplyNumber, customerName, customerAddress, sectorName,
    tariffName, connectionType, tariffTiers,
    currentReading, previousReading, consumptionKwh,
    readingDate, previousReadingDate,
    periodName, periodStart, periodEnd,
    energyAmount, conceptsBreakdown, subtotal, previousDebt, totalAmount,
    issueDate, dueDate, status, municipalityConfig, previousReceipts,
  } = props

  const ruc = municipalityConfig?.ruc || '20232953421'
  const omNumber = municipalityConfig?.om_number || 'OM N° 006-2019-MDC'
  const logoUrl = municipalityConfig?.logo_url
  const sortedTiers = [...tariffTiers].sort((a, b) => (a.order_index ?? a.min_kwh) - (b.order_index ?? b.min_kwh))
  const unitPrice = sortedTiers.length > 0 ? sortedTiers[0].price_per_kwh : null

  return (
    <div className="receipt-print-root">
      <header className="rpl-header">
        <div className={`rpl-logo${logoUrl ? ' has-image' : ''}`}>
          {logoUrl ? (
            <img src={logoUrl} alt="Escudo Municipal" />
          ) : (
            '[ ESCUDO ]'
          )}
        </div>

        <div className="rpl-header-center">
          <div className="rpl-muni-text">Municipalidad Distrital de</div>
          <div className="rpl-title-text">CURIMANA</div>
          <div className="rpl-ruc-text">RUC: {ruc}</div>
          <div className="rpl-om-text">{omNumber}</div>
        </div>

        <div className="rpl-supply-box">
          <div className="rpl-supply-title">Nº SUMINISTRO</div>
          <div className="rpl-supply-num">{supplyNumber}</div>
        </div>
      </header>

      <div className="rpl-grid">
        {/* LEFT COLUMN */}
        <div>
          <div className="rpl-box">
            <div className="rpl-box-title">DATOS DEL CLIENTE</div>
            <table className="rpl-client-table">
              <tbody>
                <tr>
                  <td>NOMBRE:</td>
                  <td>{customerName}</td>
                </tr>
                <tr>
                  <td>DIRECCIÓN:</td>
                  <td>{customerAddress}</td>
                </tr>
                <tr>
                  <td>SECTOR:</td>
                  <td>{sectorName}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="rpl-box rpl-text-center">
            <div className="rpl-box-title">DATOS TÉCNICOS</div>
            <div className="rpl-tech-title">
              TARIFA: {tariffName} - {connectionType.toUpperCase()}
            </div>
            {sortedTiers.map((tier, i) => {
              const toLabel = tier.max_kwh != null ? `${tier.max_kwh} kWh` : '+ kWh'
              return (
                <div key={i} className="rpl-tech-row">
                  <div className="rpl-tech-col-1">DE:</div>
                  <div className="rpl-tech-col-2">{tier.min_kwh} A {toLabel}:</div>
                  <div className="rpl-tech-col-3">S/ {tier.price_per_kwh.toFixed(2)}</div>
                </div>
              )
            })}
          </div>

          <div className="rpl-box">
            <div className="rpl-box-title">DETALLE DEL CONSUMO</div>
            <div className="rpl-consumo-grid">
              <div className="rpl-consumo-label">LECTURA ACTUAL</div>
              <div className="rpl-consumo-val rpl-text-red rpl-font-bold">{currentReading ?? '-'}</div>
              <div className="rpl-consumo-unit">{readingDate ? formatDate(readingDate) : ''}</div>
            </div>
            <div className="rpl-consumo-grid">
              <div className="rpl-consumo-label">LECTURA ANTERIOR</div>
              <div className="rpl-consumo-val rpl-text-red rpl-font-bold">{previousReading ?? '-'}</div>
              <div className="rpl-consumo-unit">{previousReadingDate ? formatDate(previousReadingDate) : ''}</div>
            </div>
            <div className="rpl-consumo-grid" style={{ marginBottom: 15 }}>
              <div className="rpl-consumo-label">CONSUMO FACTURADO</div>
              <div className="rpl-consumo-val">{consumptionKwh != null ? consumptionKwh : '-'}</div>
              <div className="rpl-consumo-unit">{consumptionKwh != null ? 'kWh' : ''}</div>
            </div>
            <div className="rpl-consumo-grid">
              <div className="rpl-consumo-label">PRECIO UNIT. X kWH</div>
              <div className="rpl-consumo-val">
                <span className="rpl-font-bold">S/</span> {unitPrice != null ? unitPrice.toFixed(2) : '-'}
              </div>
              <div className="rpl-consumo-unit rpl-font-bold">kW.h</div>
            </div>
          </div>

          <div className="rpl-box rpl-text-center">
            <div className="rpl-box-title">MENSAJES AL CLIENTE</div>
            <p className="rpl-msg-box">
              Este recibo corresponde a su consumo durante<br />
              el mes de <span className="rpl-msg-period">{periodName}</span>
            </p>
          </div>

          <div className="rpl-mes-left">
            <div className="rpl-mes-left-header">
              <span>MES FACTURADO</span>
              <span>{periodName}</span>
            </div>
            <div className="rpl-mes-left-body">
              <div className="rpl-mes-left-range">
                DEL: {formatDate(periodStart)} AL {formatDate(periodEnd)}
              </div>
              <div className="rpl-mes-left-total">
                <span className="rpl-mes-left-total-label">TOTAL</span>
                <span className="rpl-mes-left-total-value">{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </div>

          <div className="rpl-yellow-banner">
            ¡SI USTED YA PAGÓ, OMITA ESTE RECIBO!
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div>
          <div className="rpl-mes-top">
            <span>MES FACTURADO</span>
            <span>{periodName}</span>
          </div>

          <div className="rpl-box">
            <div className="rpl-box-title">DETALLE FACTURACIÓN</div>
            <table className="rpl-fact-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>CONCEPTO</th>
                  <th style={{ textAlign: 'right' }}>IMPORTE S/</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>ENERGÍA ACTIVA</td>
                  <td style={{ textAlign: 'right' }}>{energyAmount.toFixed(2)}</td>
                </tr>
                {conceptsBreakdown.map((c, i) => (
                  <tr key={i}>
                    <td>{c.name.toUpperCase()}</td>
                    <td style={{ textAlign: 'right' }}>{c.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rpl-sub-box">
            <span>SUB TOTAL :</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>

          <div className="rpl-sub-box">
            <span>DEUDAS ANTERIORES S/</span>
            <span>{formatCurrency(previousDebt)}</span>
          </div>

          <div className="rpl-total-box">
            <span>TOTAL A PAGAR :</span>
            <span>{formatCurrency(totalAmount)}</span>
          </div>

          <table className="rpl-dates-table">
            <thead>
              <tr>
                <th>FECHA EMISIÓN</th>
                <th>ULTIMO DÍA DE PAGO</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{issueDate ? formatDate(issueDate) : '-'}</td>
                <td className="rpl-text-red">{formatDate(dueDate)}</td>
              </tr>
            </tbody>
          </table>

          <div className="rpl-estado-box">
            <strong>ESTADO DE<br />SUMINISTRO:</strong>
            <span>{STATUS_LABELS[status ?? 'pending'] || 'PENDIENTE'}</span>
          </div>

          <div className="rpl-ref-box">
            <div className="rpl-ref-header">REFERENCIA DE MESES ANTERIORES</div>
            <div className="rpl-ref-body">
              {previousReceipts && previousReceipts.length > 0 ? (
                previousReceipts.map((ref, i) => (
                  <div key={i}>
                    {ref.periodName}: {formatCurrency(ref.totalAmount)} — {STATUS_LABELS[ref.status] || ref.status}
                  </div>
                ))
              ) : (
                <>
                  <div>¡REALIZA TUS PAGOS PUNTUALES Y EVITA LOS CORTES!</div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

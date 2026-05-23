import { ReceiptWithPeriod } from '@/types/views'

type ReceiptRowPaymentProps = {
  receipt: ReceiptWithPeriod
}

export function ReceiptRowPayment({ receipt }: ReceiptRowPaymentProps) {
  const isPayable = ['pending', 'partial', 'overdue'].includes(receipt.status ?? '')

  if (!isPayable) return null

  return (
    <span className="text-xs text-muted-foreground">Cobro en Caja</span>
  )
}

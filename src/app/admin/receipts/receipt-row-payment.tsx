'use client'

import { ReceiptWithPeriod } from '@/types/views'

type ReceiptRowPaymentProps = {
 receipt: ReceiptWithPeriod
 onPaymentSuccess: () => void
}

export function ReceiptRowPayment({ receipt, onPaymentSuccess: _onPaymentSuccess }: ReceiptRowPaymentProps) {
 const isPayable = ['pending', 'partial', 'overdue'].includes(receipt.status ?? '')

 if (!isPayable) return null

 return (
 <span className="text-xs text-muted-foreground">Cobro en Caja</span>
 )
}

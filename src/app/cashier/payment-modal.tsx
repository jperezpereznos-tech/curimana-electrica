'use client'

import { PaymentModal as SharedPaymentModal } from '@/components/payments/payment-modal'
import { processPaymentAction } from './actions'
import { Database } from '@/types/database'

type ReceiptWithPeriod = Database['public']['Tables']['receipts']['Row'] & {
  billing_periods: {
    name: string
  } | null
}

type CashierPaymentModalProps = {
  receipt: ReceiptWithPeriod
  customer: Pick<Database['public']['Tables']['customers']['Row'], 'id'>
  closureId: string
  onSuccess: () => void
}

export function PaymentModal({ receipt, customer, closureId, onSuccess }: CashierPaymentModalProps) {
  return (
    <SharedPaymentModal
      receipt={receipt}
      customer={customer}
      closureId={closureId}
      onSuccess={onSuccess}
      onProcessPayment={processPaymentAction}
    />
  )
}

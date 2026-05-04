'use client'

import { BatchPaymentModal as SharedBatchPaymentModal } from '@/components/payments/batch-payment-modal'
import { processBatchPaymentAction } from './actions'
import { Database } from '@/types/database'

type ReceiptWithPeriod = Database['public']['Tables']['receipts']['Row'] & {
  billing_periods: {
    name: string
  } | null
}

type CashierBatchPaymentModalProps = {
  receipts: ReceiptWithPeriod[]
  customer: Pick<Database['public']['Tables']['customers']['Row'], 'id' | 'full_name'>
  closureId: string
  totalDebt: number
  onSuccess: () => void
}

export function BatchPaymentModal({ receipts, customer, closureId, totalDebt, onSuccess }: CashierBatchPaymentModalProps) {
  return (
    <SharedBatchPaymentModal
      receipts={receipts}
      customer={customer}
      closureId={closureId}
      totalDebt={totalDebt}
      onSuccess={onSuccess}
      onProcessBatchPayment={processBatchPaymentAction}
    />
  )
}

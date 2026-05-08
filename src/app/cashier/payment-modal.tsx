'use client'

import { PaymentModal as SharedPaymentModal } from '@/components/payments/payment-modal'
import { processPaymentAction, getPaymentVoucherDataAction } from './actions'
import { Database } from '@/types/database'

type ReceiptWithPeriod = Database['public']['Tables']['receipts']['Row'] & {
  billing_periods: {
    name: string
  } | null
}

type CashierPaymentModalProps = {
  receipt: ReceiptWithPeriod
  customer: Pick<Database['public']['Tables']['customers']['Row'], 'id' | 'full_name' | 'supply_number' | 'address' | 'sector'>
  closureId: string
  onSuccess: () => void
  municipalityConfig?: { ruc?: string; name?: string } | null
}

export function PaymentModal({ receipt, customer, closureId, onSuccess, municipalityConfig }: CashierPaymentModalProps) {
  return (
    <SharedPaymentModal
      receipt={receipt}
      customer={customer}
      closureId={closureId}
      onSuccess={onSuccess}
      onProcessPayment={processPaymentAction}
      onGetVoucherData={getPaymentVoucherDataAction as (paymentId: string) => Promise<Record<string, unknown> | null>}
      municipalityConfig={municipalityConfig}
    />
  )
}

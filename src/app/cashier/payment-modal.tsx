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
  customer: Pick<Database['public']['Tables']['customers']['Row'], 'id' | 'full_name' | 'supply_number' | 'address'>
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
      onProcessPayment={processPaymentAction as unknown as Parameters<typeof SharedPaymentModal>[0]['onProcessPayment']}
      onGetVoucherData={getPaymentVoucherDataAction as unknown as Parameters<typeof SharedPaymentModal>[0]['onGetVoucherData']}
      municipalityConfig={municipalityConfig}
    />
  )
}

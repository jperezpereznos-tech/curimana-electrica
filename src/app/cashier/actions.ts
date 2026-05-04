'use server'

import { createClient } from '@/lib/supabase/server'
import { getPaymentService } from '@/services/payment-service'
import { getCashClosureService } from '@/services/cash-closure-service'
import { getCustomerService } from '@/services/customer-service'
import { getReceiptService } from '@/services/receipt-service'
import { revalidatePath } from 'next/cache'

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  return { supabase, userId: user.id }
}

export async function processPaymentAction(data: {
  receiptId: string
  customerId: string
  cashClosureId: string
  amount: number
  paymentMethod: 'cash' | 'transfer' | 'card'
  receivedAmount: number
  changeAmount: number
  reference?: string
}) {
  const { supabase, userId } = await requireAuth()
  const paymentService = getPaymentService(supabase)

  const result = await paymentService.processPayment({ ...data, cashierUserId: userId })
  revalidatePath('/cashier')
  return result
}

export async function processBatchPaymentAction(data: {
  payments: { receiptId: string; amount: number }[]
  customerId: string
  cashClosureId: string
  paymentMethod: 'cash' | 'transfer' | 'card'
  reference?: string
}) {
  const { supabase, userId } = await requireAuth()
  const paymentService = getPaymentService(supabase)

  const result = await paymentService.processBatchPayment({ ...data, cashierUserId: userId })
  revalidatePath('/cashier')
  return result
}

export async function openClosureAction(userId: string, amount: number) {
  const { supabase } = await requireAuth()
  const cashClosureService = getCashClosureService(supabase)

  const result = await cashClosureService.openClosure(userId, amount)
  revalidatePath('/cashier')
  return result
}

export async function closeClosureAction(closureId: string) {
  const { supabase, userId } = await requireAuth()
  const cashClosureService = getCashClosureService(supabase)

  const result = await cashClosureService.closeClosure(closureId, userId)
  revalidatePath('/cashier')
  return result
}

export async function searchCashierCustomerAction(query: string) {
  const { supabase } = await requireAuth()
  const customerService = getCustomerService(supabase)
  const receiptService = getReceiptService(supabase)

  const results = await customerService.searchCustomers(query)
  if (!results || results.length === 0) return null

  const customer = results[0]

  const [pendingReceipts, partialReceipts, overdueReceipts] = await Promise.all([
    receiptService.getAllReceipts({ supplyNumber: customer.supply_number, status: 'pending' }),
    receiptService.getAllReceipts({ supplyNumber: customer.supply_number, status: 'partial' }),
    receiptService.getAllReceipts({ supplyNumber: customer.supply_number, status: 'overdue' }),
  ])

  const receipts = [...(pendingReceipts || []), ...(partialReceipts || []), ...(overdueReceipts || [])]

  return { customer, receipts }
}

export async function getPaymentsByCashierAction(userId: string, dateFilterParams: { from?: string; to?: string }) {
  const { supabase } = await requireAuth()
  const paymentService = getPaymentService(supabase)

  const data = await paymentService.getPaymentsByCashier(userId, dateFilterParams)
  return data?.map((p: any) => ({
    id: p.id,
    receipt_number: p.receipts?.receipt_number?.toString() || 'N/A',
    customer_name: p.receipts?.customers?.full_name || 'Desconocido',
    supply_number: p.receipts?.customers?.supply_number || 'N/A',
    amount: p.amount,
    payment_date: p.payment_date,
    status: 'completed',
    reference: p.reference
  })) || []
}

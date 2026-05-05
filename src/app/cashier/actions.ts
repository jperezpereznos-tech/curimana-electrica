'use server'

import { requireCashierAuth } from '@/lib/auth/server-cashier-auth'
import { getPaymentService } from '@/services/payment-service'
import { getCashClosureService } from '@/services/cash-closure-service'
import { getCustomerService } from '@/services/customer-service'
import { getReceiptService } from '@/services/receipt-service'
import { revalidatePath } from 'next/cache'

export async function processPaymentAction(data: {
  receiptId: string
  customerId: string
  cashClosureId: string
  amount: number
  paymentMethod: 'cash'
  receivedAmount: number
  changeAmount: number
}) {
  const { supabase, userId } = await requireCashierAuth()
  const paymentService = getPaymentService(supabase)

  const result = await paymentService.processPayment({ ...data, cashierUserId: userId })
  revalidatePath('/cashier')
  return result
}

export async function processBatchPaymentAction(data: {
  payments: { receiptId: string; amount: number }[]
  customerId: string
  cashClosureId: string
  paymentMethod: 'cash'
  receivedAmount?: number
  changeAmount?: number
}) {
  const { supabase, userId } = await requireCashierAuth()
  const paymentService = getPaymentService(supabase)

  const result = await paymentService.processBatchPayment({ ...data, cashierUserId: userId })
  revalidatePath('/cashier')
  return result
}

export async function openClosureAction(amount: number) {
  const { supabase, userId } = await requireCashierAuth()
  const cashClosureService = getCashClosureService(supabase)

  const result = await cashClosureService.openClosure(userId, amount)
  revalidatePath('/cashier')
  return result
}

export async function closeClosureAction(closureId: string) {
  const { supabase, userId } = await requireCashierAuth()
  const cashClosureService = getCashClosureService(supabase)

  const result = await cashClosureService.closeClosure(closureId, userId)
  revalidatePath('/cashier')
  return result
}

export async function searchCashierCustomerAction(query: string) {
  const { supabase } = await requireCashierAuth()
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
  const { supabase } = await requireCashierAuth()
  const paymentService = getPaymentService(supabase)

  const data = await paymentService.getPaymentsByCashier(userId, dateFilterParams)
  return data?.map((p: Record<string, unknown>) => ({
    id: p.id as string,
    receipt_number: ((p.receipts as Record<string, unknown> | null)?.receipt_number as string | number)?.toString() || 'N/A',
    customer_name: ((p.receipts as Record<string, unknown> | null)?.customers as Record<string, unknown> | null)?.full_name as string || 'Desconocido',
    supply_number: ((p.receipts as Record<string, unknown> | null)?.customers as Record<string, unknown> | null)?.supply_number as string || 'N/A',
    amount: p.amount as number,
    payment_date: p.payment_date as string,
    status: (p.status as string) || 'completed',
    reference: p.reference as string | null
  })) || []
}

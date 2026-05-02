'use server'

import { createClient } from '@/lib/supabase/server'
import { getPaymentService } from '@/services/payment-service'
import { getCashClosureService } from '@/services/cash-closure-service'
import { getCustomerService } from '@/services/customer-service'
import { getReceiptService } from '@/services/receipt-service'
import { revalidatePath } from 'next/cache'

export async function processPaymentAction(data: any) {
  const supabase = await createClient()
  await supabase.auth.getUser()
  const paymentService = getPaymentService(supabase)

  const result = await paymentService.processPayment(data)
  revalidatePath('/cashier')
  return result
}

export async function openClosureAction(userId: string, amount: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const cashClosureService = getCashClosureService(supabase)

  const result = await cashClosureService.openClosure(userId, amount)
  revalidatePath('/cashier')
  return result
}

export async function closeClosureAction(closureId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const cashClosureService = getCashClosureService(supabase)

  const result = await cashClosureService.closeClosure(closureId, user?.id)
  revalidatePath('/cashier')
  return result
}

export async function searchCashierCustomerAction(query: string) {
  const supabase = await createClient()
  await supabase.auth.getUser()
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
  const supabase = await createClient()
  await supabase.auth.getUser()
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

'use server'

import { requireAdminAuth } from '@/lib/auth/server-admin-auth'
import { getPaymentService } from '@/services/payment-service'
import { getCashClosureService } from '@/services/cash-closure-service'
import { getCustomerService } from '@/services/customer-service'
import { getReceiptService } from '@/services/receipt-service'
import { revalidatePath } from 'next/cache'

export async function adminProcessPaymentAction(data: {
  receiptId: string
  customerId: string
  cashClosureId: string
  amount: number
  paymentMethod: 'cash'
  receivedAmount: number
  changeAmount: number
}) {
  const { supabase, userId } = await requireAdminAuth()
  const paymentService = getPaymentService(supabase)

  const result = await paymentService.processPayment({ ...data, cashierUserId: userId })
  revalidatePath('/admin/receipts')
  revalidatePath('/admin/payments')
  revalidatePath('/admin/customers')
  return result
}

export async function adminProcessBatchPaymentAction(data: {
  payments: { receiptId: string; amount: number }[]
  customerId: string
  cashClosureId: string
  paymentMethod: 'cash'
  receivedAmount?: number
  changeAmount?: number
}) {
  const { supabase, userId } = await requireAdminAuth()
  const paymentService = getPaymentService(supabase)

  const result = await paymentService.processBatchPayment({ ...data, cashierUserId: userId })
  revalidatePath('/admin/receipts')
  revalidatePath('/admin/payments')
  revalidatePath('/admin/customers')
  return result
}

export async function adminGetActiveClosureAction() {
  const { supabase, userId } = await requireAdminAuth()
  const cashClosureService = getCashClosureService(supabase)
  return await cashClosureService.getActiveClosure(userId)
}

export async function adminOpenClosureAction(initialAmount: number) {
  const { supabase, userId } = await requireAdminAuth()
  const cashClosureService = getCashClosureService(supabase)

  const result = await cashClosureService.openClosure(userId, initialAmount)
  revalidatePath('/admin/payments')
  return result
}

export async function adminSearchCustomerReceiptsAction(query: string) {
  const { supabase } = await requireAdminAuth()
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

export async function voidPaymentAction(paymentId: string) {
  const { supabase, userId } = await requireAdminAuth()
  const paymentService = getPaymentService(supabase)

  const result = await paymentService.voidPayment(paymentId, userId)
  revalidatePath('/admin/payments')
  revalidatePath('/admin/receipts')
  return result
}

'use server'

import { requireAdminAuth } from '@/lib/auth/server-admin-auth'
import { getPaymentService } from '@/services/payment-service'
import { getCustomerService } from '@/services/customer-service'
import { getReceiptService } from '@/services/receipt-service'
import { revalidatePath } from 'next/cache'

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

export async function getPaymentDetailsAction(paymentId: string) {
  const { supabase } = await requireAdminAuth()
  const paymentService = getPaymentService(supabase)
  return await paymentService.getPaymentDetails(paymentId)
}

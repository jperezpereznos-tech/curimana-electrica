'use server'

import { requireAdminAuth } from '@/lib/auth/server-admin-auth'
import { getPaymentService } from '@/services/payment-service'
import { getCustomerService } from '@/services/customer-service'
import { getReceiptService } from '@/services/receipt-service'
import { revalidatePath } from 'next/cache'

export async function adminSearchCustomerReceiptsAction(query: string) {
  try {
    const { supabase } = await requireAdminAuth()
    const customerService = getCustomerService(supabase)
    const receiptService = getReceiptService(supabase)

    const results = await customerService.searchCustomers(query)
    if (!results || results.length === 0) return { success: true as const, data: null }

    const customer = results[0]

    const [pendingReceipts, partialReceipts, overdueReceipts] = await Promise.all([
      receiptService.getAllReceipts({ supplyNumber: customer.supply_number, status: 'pending' }),
      receiptService.getAllReceipts({ supplyNumber: customer.supply_number, status: 'partial' }),
      receiptService.getAllReceipts({ supplyNumber: customer.supply_number, status: 'overdue' }),
    ])

    const receipts = [...(pendingReceipts || []), ...(partialReceipts || []), ...(overdueReceipts || [])]
    return { success: true as const, data: { customer, receipts } }
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : 'Error al buscar recibos del cliente' }
  }
}

export async function voidPaymentAction(paymentId: string) {
  try {
    const { supabase, userId } = await requireAdminAuth()
    const paymentService = getPaymentService(supabase)
    await paymentService.voidPayment(paymentId, userId)
    revalidatePath('/admin/payments')
    revalidatePath('/admin/receipts')
    return { success: true as const }
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : 'Error al anular el pago' }
  }
}

export async function getPaymentDetailsAction(paymentId: string) {
  try {
    const { supabase } = await requireAdminAuth()
    const paymentService = getPaymentService(supabase)
    const data = await paymentService.getPaymentDetails(paymentId)
    return { success: true as const, data }
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : 'Error al obtener detalles del pago' }
  }
}

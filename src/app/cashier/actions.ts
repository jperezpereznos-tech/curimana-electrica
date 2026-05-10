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
  try {
    const { supabase, userId } = await requireCashierAuth()
    const paymentService = getPaymentService(supabase)

    const result = await paymentService.processPayment({ ...data, cashierUserId: userId })
    revalidatePath('/cashier')
    return { success: true as const, data: result }
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : 'Error al procesar el pago.' }
  }
}

export async function processBatchPaymentAction(data: {
  payments: { receiptId: string; amount: number }[]
  customerId: string
  cashClosureId: string
  paymentMethod: 'cash'
  receivedAmount?: number
  changeAmount?: number
}) {
  try {
    const { supabase, userId } = await requireCashierAuth()
    const paymentService = getPaymentService(supabase)

    const result = await paymentService.processBatchPayment({ ...data, cashierUserId: userId })
    revalidatePath('/cashier')
    return { success: true as const, data: result }
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : 'Error al procesar el pago lote.' }
  }
}

export async function openClosureAction(amount: number) {
  try {
    const { supabase, userId } = await requireCashierAuth()
    const cashClosureService = getCashClosureService(supabase)

    const result = await cashClosureService.openClosure(userId, amount)
    revalidatePath('/cashier')
    return { success: true as const, data: result }
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : 'Error al abrir caja.' }
  }
}

export async function closeClosureAction(closureId: string) {
  try {
    const { supabase, userId } = await requireCashierAuth()
    const cashClosureService = getCashClosureService(supabase)

    const result = await cashClosureService.closeClosure(closureId, userId)
    revalidatePath('/cashier')
    return { success: true as const, data: result }
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : 'Error al cerrar caja.' }
  }
}

export async function searchCashierCustomerAction(query: string) {
  try {
    const { supabase } = await requireCashierAuth()
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
    return { success: false as const, error: e instanceof Error ? e.message : 'Error al buscar cliente.' }
  }
}

export async function getCustomerPaymentsAction(customerId: string) {
  try {
    const { supabase } = await requireCashierAuth()
    const paymentService = getPaymentService(supabase)
    const data = await paymentService.getPaymentsByCustomer(customerId)
    return { success: true as const, data }
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : 'Error al obtener pagos.' }
  }
}

export async function getPaymentVoucherDataAction(paymentId: string) {
  try {
    const { supabase } = await requireCashierAuth()
    const paymentService = getPaymentService(supabase)
    const data = await paymentService.getPaymentDetails(paymentId)
    return { success: true as const, data }
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : 'Error al obtener datos del comprobante.' }
  }
}

export async function getPaymentsByCashierAction(userId: string, dateFilterParams: { from?: string; to?: string }) {
  try {
    const { supabase } = await requireCashierAuth()
    const paymentService = getPaymentService(supabase)

 const data = await paymentService.getPaymentsByCashier(userId, dateFilterParams)
 const mapped = data?.map((p) => ({
      id: p.id,
      receipt_number: p.receipts?.receipt_number?.toString() || 'N/A',
      customer_name: p.receipts?.customers?.full_name || 'Desconocido',
      supply_number: p.receipts?.customers?.supply_number || 'N/A',
      amount: p.amount,
      payment_date: p.payment_date || '',
      status: p.status || 'completed',
      reference: p.reference || null
    })) || []
    return { success: true as const, data: mapped }
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : 'Error al obtener pagos.' }
  }
}

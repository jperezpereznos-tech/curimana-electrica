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
    revalidatePath('/admin/customers')
    revalidatePath('/admin/receipts')
    revalidatePath('/admin/payments')
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
    revalidatePath('/admin/customers')
    revalidatePath('/admin/receipts')
    revalidatePath('/admin/payments')
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
    const receiptService = getReceiptService(supabase)
    const customerService = getCustomerService(supabase)

    const customer = await customerService.getBySupplyNumber(query.trim())

    if (customer) {
      await supabase.rpc('recalculate_customer_debt', { p_customer_id: customer.id })

      const { data: refreshedCustomer } = await supabase
        .from('customers')
        .select('current_debt')
        .eq('id', customer.id)
        .single()

      if (refreshedCustomer) {
        customer.current_debt = refreshedCustomer.current_debt
      }

      const [pendingReceipts, partialReceipts, overdueReceipts] = await Promise.all([
        receiptService.getAllReceipts({ customerId: customer.id, status: 'pending' }),
        receiptService.getAllReceipts({ customerId: customer.id, status: 'partial' }),
        receiptService.getAllReceipts({ customerId: customer.id, status: 'overdue' }),
      ])

      const seen = new Set<string>()
      const receipts = [...(pendingReceipts || []), ...(partialReceipts || []), ...(overdueReceipts || [])].filter((r) => {
        if (seen.has(r.id)) return false
        seen.add(r.id)
        return true
      })

      return { success: true as const, data: { customer, receipts } }
    }

    const results = await customerService.searchCustomers(query)
    if (results && results.length > 0) {
      const matchedCustomer = results.find(c => c.supply_number === query.trim()) || results[0]

      await supabase.rpc('recalculate_customer_debt', { p_customer_id: matchedCustomer.id })

      const { data: refreshedCustomer } = await supabase
        .from('customers')
        .select('current_debt')
        .eq('id', matchedCustomer.id)
        .single()

      if (refreshedCustomer) {
        matchedCustomer.current_debt = refreshedCustomer.current_debt
      }

      const [pendingReceipts, partialReceipts, overdueReceipts] = await Promise.all([
        receiptService.getAllReceipts({ customerId: matchedCustomer.id, status: 'pending' }),
        receiptService.getAllReceipts({ customerId: matchedCustomer.id, status: 'partial' }),
        receiptService.getAllReceipts({ customerId: matchedCustomer.id, status: 'overdue' }),
      ])

      const seen = new Set<string>()
      const receipts = [...(pendingReceipts || []), ...(partialReceipts || []), ...(overdueReceipts || [])].filter((r) => {
        if (seen.has(r.id)) return false
        seen.add(r.id)
        return true
      })

      return { success: true as const, data: { customer: matchedCustomer, receipts } }
    }

    const receiptNumber = Number(query)
    if (!isNaN(receiptNumber) && receiptNumber > 0 && query.trim() === String(receiptNumber)) {
      const receipt = await receiptService.getReceiptByNumber(receiptNumber)
      if (receipt && receipt.status !== 'cancelled') {
        const receiptCustomer = await customerService.getBySupplyNumber(receipt.customers?.supply_number || '')
        if (receiptCustomer) {
          await supabase.rpc('recalculate_customer_debt', { p_customer_id: receiptCustomer.id })
          const { data: refreshedCustomer } = await supabase
            .from('customers')
            .select('current_debt')
            .eq('id', receiptCustomer.id)
            .single()
          if (refreshedCustomer) receiptCustomer.current_debt = refreshedCustomer.current_debt

          return { success: true as const, data: { customer: receiptCustomer, receipts: [receipt] } }
        }
      }
    }

    return { success: true as const, data: null }
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

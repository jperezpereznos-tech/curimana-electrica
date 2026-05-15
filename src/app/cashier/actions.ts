'use server'

import { requireCashierAuth } from '@/lib/auth/server-cashier-auth'
import { getPaymentService } from '@/services/payment-service'
import { getCashClosureService } from '@/services/cash-closure-service'
import { getCustomerService } from '@/services/customer-service'
import { getReceiptService } from '@/services/receipt-service'
import { revalidatePath } from 'next/cache'
import { paymentActionSchema, batchPaymentActionSchema, openClosureSchema, uuidSchema, querySchema } from '@/lib/validations/schemas'

export async function processPaymentAction(data: unknown) {
  try {
    const parsed = paymentActionSchema.parse(data)
    const { supabase, userId } = await requireCashierAuth()
    const paymentService = getPaymentService(supabase)

    const result = await paymentService.processPayment({ ...parsed, cashierUserId: userId })
    revalidatePath('/cashier')
    revalidatePath('/admin/customers')
    revalidatePath('/admin/receipts')
    revalidatePath('/admin/payments')
    return { success: true as const, data: result }
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : 'Error al procesar el pago.' }
  }
}

export async function processBatchPaymentAction(data: unknown) {
  try {
    const parsed = batchPaymentActionSchema.parse(data)
    const { supabase, userId } = await requireCashierAuth()
    const paymentService = getPaymentService(supabase)

    const result = await paymentService.processBatchPayment({ ...parsed, cashierUserId: userId })
    revalidatePath('/cashier')
    revalidatePath('/admin/customers')
    revalidatePath('/admin/receipts')
    revalidatePath('/admin/payments')
    return { success: true as const, data: result }
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : 'Error al procesar el pago lote.' }
  }
}

export async function openClosureAction(amount: unknown) {
  try {
    const parsed = openClosureSchema.parse(amount)
    const { supabase, userId } = await requireCashierAuth()
    const cashClosureService = getCashClosureService(supabase)

    const result = await cashClosureService.openClosure(userId, parsed)
    revalidatePath('/cashier')
    return { success: true as const, data: result }
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : 'Error al abrir caja.' }
  }
}

export async function closeClosureAction(closureId: string) {
  try {
    uuidSchema.parse(closureId)
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
    const parsed = querySchema.parse(query)
    const { supabase } = await requireCashierAuth()
    const receiptService = getReceiptService(supabase)
    const customerService = getCustomerService(supabase)

    const customer = await customerService.getBySupplyNumber(parsed.trim())

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

    const results = await customerService.searchCustomers(parsed)
    if (results && results.length > 0) {
      const matchedCustomer = results.find(c => c.supply_number === parsed.trim()) || results[0]

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

    const receiptNumber = Number(parsed)
    if (!isNaN(receiptNumber) && receiptNumber > 0 && parsed.trim() === String(receiptNumber)) {
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
    uuidSchema.parse(customerId)
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
    uuidSchema.parse(paymentId)
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
    uuidSchema.parse(userId)
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

export async function getReceiptPrintDataAction(receiptId: string) {
  try {
    uuidSchema.parse(receiptId)
    const { supabase } = await requireCashierAuth()
    const receiptService = getReceiptService(supabase)
    const receipt = await receiptService.getReceiptDetails(receiptId)
    if (!receipt) return { success: false as const, error: 'Recibo no encontrado.' }

    const { getConceptService } = await import('@/services/concept-service')
    const conceptService = getConceptService(supabase)
    const concepts = await conceptService.getActiveConcepts()

    const { data: municipalityConfig } = await supabase
      .from('municipality_config')
      .select('*')
      .limit(1)
      .single()

    const tariffTiers = receipt.customers?.tariffs?.tariff_tiers ?? []
    const sortedTiers = [...tariffTiers].sort((a, b) => a.min_kwh - b.min_kwh)

    const fixedConcepts = concepts.map(c => ({
      name: c.name,
      amount: c.amount,
      type: c.type ?? 'fixed',
    }))

    const breakdown = receiptService.calculateBreakdown(
      receipt.consumption_kwh ?? 0,
      sortedTiers,
      fixedConcepts,
      receipt.previous_debt ?? 0
    )

    const { data: prevReceipts } = await supabase
      .from('receipts')
      .select('total_amount, status, billing_periods(name)')
      .eq('customer_id', receipt.customer_id ?? '')
      .neq('id', receipt.id)
      .order('created_at', { ascending: false })
      .limit(3)

    const previousReceiptRefs = (prevReceipts ?? []).map(r => ({
      periodName: (r.billing_periods as { name: string } | null)?.name ?? '-',
      totalAmount: r.total_amount,
      status: r.status ?? 'pending',
    }))

    return {
      success: true as const,
      data: {
        supplyNumber: receipt.customers?.supply_number ?? '',
        customerName: receipt.customers?.full_name ?? '',
        customerAddress: receipt.customers?.address ?? '',
        sectorName: receipt.customers?.sectors?.name ?? '',
        tariffName: receipt.customers?.tariffs?.name ?? 'BT5B-RESIDENCIAL',
        connectionType: receipt.customers?.tariffs?.connection_type ?? 'monofásico',
        tariffTiers: sortedTiers.map(t => ({
          min_kwh: t.min_kwh,
          max_kwh: t.max_kwh,
          price_per_kwh: t.price_per_kwh,
          order_index: t.order_index,
        })),
        currentReading: receipt.current_reading,
        previousReading: receipt.previous_reading,
        consumptionKwh: receipt.consumption_kwh,
        readingDate: receipt.readings?.reading_date ?? receipt.period_end,
        previousReadingDate: receipt.period_start,
        periodName: receipt.billing_periods?.name ?? '',
        periodStart: receipt.period_start,
        periodEnd: receipt.period_end,
        energyAmount: receipt.energy_amount,
        conceptsBreakdown: breakdown.conceptsBreakdown,
        subtotal: receipt.subtotal,
        previousDebt: receipt.previous_debt ?? 0,
        totalAmount: receipt.total_amount,
        issueDate: receipt.issue_date,
        dueDate: receipt.due_date,
        status: receipt.status,
        municipalityConfig: municipalityConfig ? {
          ruc: municipalityConfig.ruc,
          name: municipalityConfig.name,
          om_number: municipalityConfig.om_number,
          logo_url: municipalityConfig.logo_url,
        } : null,
        previousReceipts: previousReceiptRefs,
      },
    }
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : 'Error al obtener datos del recibo.' }
  }
}

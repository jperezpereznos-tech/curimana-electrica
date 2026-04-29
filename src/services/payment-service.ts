import { paymentRepository } from '@/repositories/payment-repository'
import { receiptRepository } from '@/repositories/receipt-repository'
import { customerRepository } from '@/repositories/customer-repository'
import { cashClosureRepository } from '@/repositories/cash-closure-repository'
import { auditService } from '@/services/audit-service'

export class PaymentService {
  /**
   * Registra un pago y actualiza el estado del recibo y la deuda del cliente.
   */
  async processPayment(data: {
    receiptId: string
    customerId: string
    cashClosureId: string
    amount: number
    paymentMethod: 'cash'
    receivedAmount: number
    changeAmount: number
  }) {
    const { receiptId, customerId, amount, cashClosureId } = data
    const closure = await cashClosureRepository.getById(cashClosureId)
    if (!closure?.cashier_id) throw new Error('Caja no valida para registrar pago')


    // 1. Obtener datos actuales
    const receipt = await receiptRepository.getById(receiptId)
    if (!receipt) throw new Error('Recibo no encontrado')

    const remaining = receipt.total_amount - (receipt.paid_amount || 0)
    if (amount <= 0) throw new Error('El monto debe ser mayor a cero')
    if (amount > remaining) throw new Error('El monto excede el saldo pendiente')
    if (receipt.status === 'cancelled' || receipt.status === 'paid') {
      throw new Error('El recibo no permite nuevos pagos')
    }

    // 2. Registrar el pago
    const payment = await paymentRepository.create({
      receipt_id: receiptId,
      customer_id: customerId,
      amount: amount,
      method: data.paymentMethod,
      reference: `PAY-${Date.now()}`,
      cashier_id: closure.cashier_id
    })

    // 3. Actualizar el recibo
    const newPaidAmount = (receipt.paid_amount || 0) + amount
    const isFullyPaid = newPaidAmount >= receipt.total_amount
    
    await receiptRepository.update(receiptId, {
      paid_amount: newPaidAmount,
      status: isFullyPaid ? 'paid' : 'pending'
    })

    // 4. Actualizar la deuda del cliente
    // La deuda del cliente se reduce por el monto pagado
    const customer = await customerRepository.getById(customerId)
    if (customer) {
      const newDebt = Math.max(0, (customer.current_debt || 0) - amount)
      await customerRepository.update(customerId, {
        current_debt: newDebt
      })
    }

    // 5. Registrar en Auditoría
    await auditService.log({
      table_name: 'payments',
      record_id: payment.id,
      action: 'INSERT',
      new_data: payment,
      user_id: closure.cashier_id
    })

    return payment
  }

  async getPaymentsByCashier(cashierId: string) {
    return await paymentRepository.getPaymentsByCashier(cashierId)
  }
}

export const paymentService = new PaymentService()

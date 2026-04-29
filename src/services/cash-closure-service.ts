import { cashClosureRepository } from '@/repositories/cash-closure-repository'
import { paymentRepository } from '@/repositories/payment-repository'

export class CashClosureService {
  async getActiveClosure(userId: string) {
    return await cashClosureRepository.getActiveClosure(userId)
  }

  async openClosure(userId: string, initialAmount: number) {
    return await cashClosureRepository.create({
      cashier_id: userId,
      opening_amount: initialAmount,
      total_collected: 0,
      total_receipts: 0,
      status: 'open'
    })
  }

  async closeClosure(id: string) {
    const closure = await cashClosureRepository.getById(id)
    if (!closure) {
      throw new Error('No se encontro el cierre de caja')
    }

    // 1. Calcular totales desde los pagos registrados
    if (!closure.cashier_id) {
      throw new Error('El cierre no tiene cajero asociado')
    }

    const payments = await paymentRepository.getPaymentsByCashier(closure.cashier_id)
    const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0)
    const receiptsCount = new Set(payments.map(p => p.receipt_id)).size

    // 2. Actualizar cierre
    return await cashClosureRepository.close(id, {
      closed_at: new Date().toISOString(),
      total_collected: totalCollected,
      total_receipts: receiptsCount
    })
  }
}

export const cashClosureService = new CashClosureService()

import { auditRepository } from '@/repositories/audit-repository'
import { Database } from '@/types/database'

export class AuditService {
  async log(data: {
    table_name: string
    record_id: string
    action: 'INSERT' | 'UPDATE' | 'DELETE'
    old_data?: any
    new_data?: any
    user_id?: string
    user_role?: string
  }) {
    try {
      await auditRepository.create({
        ...data,
        ip_address: '0.0.0.0' // En producción se obtendría de la request
      })
    } catch (error) {
      console.error('Error recording audit log:', error)
      // No lanzamos el error para no bloquear la transacción principal
    }
  }

  async getAuditLogs() {
    return await auditRepository.getAllLogs()
  }
}

export const auditService = new AuditService()

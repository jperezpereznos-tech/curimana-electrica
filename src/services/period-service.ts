import { periodRepository } from '@/repositories/period-repository'
import { Database } from '@/types/database'
import { format, subMonths, startOfMonth, endOfMonth, setDate } from 'date-fns'
import { es } from 'date-fns/locale'

type PeriodInsert = Database['public']['Tables']['billing_periods']['Insert']

export class PeriodService {
  /**
   * Genera los datos para un nuevo periodo basado en el mes y año actual o especificado.
   * Si el día de corte es 26:
   * El periodo de JUNIO 2025 sería: 26/05/2025 al 25/06/2025.
   */
  calculatePeriodDates(year: number, month: number, cutDay: number = 26) {
    // Mes actual para el periodo (ej: Junio)
    const currentMonthDate = new Date(year, month - 1, 1)
    
    // El fin del periodo es el día anterior al corte del mes actual
    const endDate = setDate(currentMonthDate, cutDay - 1)
    
    // El inicio es el día de corte del mes anterior
    const startDate = setDate(subMonths(currentMonthDate, 1), cutDay)
    
    const name = format(currentMonthDate, 'MMMM yyyy', { locale: es }).toUpperCase()

    return {
      name,
      year,
      month,
      start_date: format(startDate, 'yyyy-MM-dd'),
      end_date: format(endDate, 'yyyy-MM-dd'),
      is_closed: false
    }
  }

  async createNextPeriod() {
    // Por simplicidad, tomamos el mes siguiente al último periodo creado
    const lastPeriod = await periodRepository.getCurrentPeriod()
    let nextYear, nextMonth

    if (lastPeriod) {
      nextMonth = lastPeriod.month + 1
      nextYear = lastPeriod.year
      if (nextMonth > 12) {
        nextMonth = 1
        nextYear++
      }
    } else {
      const now = new Date()
      nextYear = now.getFullYear()
      nextMonth = now.getMonth() + 1
    }

    const periodData = this.calculatePeriodDates(nextYear, nextMonth)
    return await periodRepository.create(periodData)
  }

  async getAllPeriods() {
    return await periodRepository.getAllPeriods()
  }

  async closePeriod(id: string) {
    // Aquí se llamaría a la Edge Function en el futuro
    return await periodRepository.update(id, { 
      is_closed: true, 
      closed_at: new Date().toISOString() 
    })
  }
}

export const periodService = new PeriodService()

import { PeriodRepository } from '@/repositories/period-repository'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { format, subMonths, setDate } from 'date-fns'
import { es } from 'date-fns/locale'

export class PeriodService {
  private periodRepo: PeriodRepository

  constructor(supabaseClient?: SupabaseClient<Database>) {
    this.periodRepo = new PeriodRepository(supabaseClient)
  }

  calculatePeriodDates(year: number, month: number, cutDay: number = 26) {
    const currentMonthDate = new Date(year, month - 1, 1)
    const endDate = setDate(currentMonthDate, cutDay - 1)
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
    const lastPeriod = await this.periodRepo.getCurrentPeriod()
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
    return await this.periodRepo.create(periodData)
  }

  async getAllPeriods() {
    return await this.periodRepo.getAllPeriods()
  }

  async closePeriod(id: string) {
    return await this.periodRepo.update(id, {
      is_closed: true,
      closed_at: new Date().toISOString()
    })
  }
}

export const periodService = new PeriodService()

export function getPeriodService(supabaseClient: SupabaseClient<Database>) {
  return new PeriodService(supabaseClient)
}

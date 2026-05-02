'use server'

import { createClient } from '@/lib/supabase/server'
import { getReadingService } from '@/services/reading-service'
import { getPeriodService } from '@/services/period-service'
import { getCustomerService } from '@/services/customer-service'

export async function getReaderDashboardDataAction() {
  const supabase = await createClient()
  const readingService = getReadingService(supabase)
  const periodService = getPeriodService(supabase)
  
  const [syncedCount, activeCustomers, period] = await Promise.all([
    readingService.getTodayReadingsCount(),
    readingService.getActiveCustomersCount(),
    periodService.getCurrentPeriod()
  ])

  return {
    syncedCount,
    activeCustomers,
    period: period ? {
      name: period.name,
      endDate: period.end_date
    } : null
  }
}

export async function searchReaderCustomersAction(query: string) {
  const supabase = await createClient()
  const customerService = getCustomerService(supabase)
  return await customerService.searchCustomers(query)
}

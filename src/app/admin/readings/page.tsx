import { AdminLayout } from '@/components/layouts/admin-layout'
import { createClient } from '@/lib/supabase/server'
import { getReadingService } from '@/services/reading-service'
import { getPeriodService } from '@/services/period-service'
import { ReadingsList } from './readings-list'

export default async function ReadingsPage() {
  const supabase = await createClient()
  const readingService = getReadingService(supabase)
  const periodService = getPeriodService(supabase)

  let readings: any[] = []
  let periods: any[] = []
  let reviewCount = 0

  try { readings = await readingService.getAllForAdmin() } catch {}
  try { periods = await periodService.getAllPeriods() } catch {}
  try { reviewCount = await readingService.getReviewCount() } catch {}

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Lecturas</h2>
          <p className="text-muted-foreground">
            Registro de lecturas de medidores por período. Revisa lecturas marcadas para verificación.
          </p>
        </div>

        <ReadingsList
          initialReadings={readings}
          periods={periods}
          initialReviewCount={reviewCount}
        />
      </div>
    </AdminLayout>
  )
}

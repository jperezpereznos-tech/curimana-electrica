import { AdminLayout } from '@/components/layouts/admin-layout'
import { getSectorService } from '@/services/sector-service'
import { createClient } from '@/lib/supabase/server'
import { SectorsList } from './sectors-list'
import { CreateSectorDialog } from './create-sector-dialog'

export default async function SectorsPage() {
  const supabase = await createClient()
  const sectorService = getSectorService(supabase)

  let sectors: any[] = []
  let readers: any[] = []

  try {
    sectors = await sectorService.getAllSectors()
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, assigned_sector_id')
      .eq('role', 'meter_reader')
      .order('full_name', { ascending: true })
    readers = data ?? []
  } catch {}

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Sectores</h2>
          <p className="text-muted-foreground">Gestión de sectores y asignación de lecturadores.</p>
        </div>
        <CreateSectorDialog />
      </div>

      <SectorsList initialSectors={sectors} readers={readers} />
    </AdminLayout>
  )
}

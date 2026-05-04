import { getSectorService } from '@/services/sector-service'
import { createClient } from '@/lib/supabase/server'
import { SectorsList } from './sectors-list'
import { CreateSectorDialog } from './create-sector-dialog'

export default async function SectorsPage() {
  const supabase = await createClient()
  const sectorService = getSectorService(supabase)

  let sectors: any[] = []
  let readers: any[] = []
  let pageError: string | null = null

  try {
    sectors = await sectorService.getAllSectors()
    const { data, error: readersError } = await supabase
      .from('profiles')
      .select('id, full_name, email, assigned_sector_id')
      .eq('role', 'meter_reader')
      .order('full_name', { ascending: true })
    if (readersError) throw readersError
    readers = data ?? []
  } catch (e: any) {
    pageError = e?.message || e?.code || 'Error al cargar datos de sectores'
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Sectores</h2>
          <p className="text-muted-foreground">Gestion de sectores y asignacion de lecturadores.</p>
        </div>
        <CreateSectorDialog />
      </div>

      {pageError && (
        <div className="bg-destructive/10 text-destructive text-sm p-4 rounded-lg mb-4">
          {pageError}
        </div>
      )}

      <SectorsList initialSectors={sectors} readers={readers} />
    </>
  )
}

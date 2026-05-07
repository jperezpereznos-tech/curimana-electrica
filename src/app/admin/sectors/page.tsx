import { getSectorService } from '@/services/sector-service'
import { getProfileService } from '@/services/profile-service'
import { createClient } from '@/lib/supabase/server'
import { SectorsList } from './sectors-list'
import { CreateSectorDialog } from './create-sector-dialog'
import type { SectorRow, ReaderProfilePartial } from '@/types/views'

export default async function SectorsPage() {
  const supabase = await createClient()
  const sectorService = getSectorService(supabase)
  const profileService = getProfileService(supabase)

  let sectors: SectorRow[] = []
  let readers: ReaderProfilePartial[] = []
  let pageError: string | null = null

  try {
    sectors = await sectorService.getAllSectors()
    readers = await profileService.getReaders()
  } catch (e: unknown) {
    pageError = e instanceof Error ? e.message : 'Error al cargar datos de sectores'
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
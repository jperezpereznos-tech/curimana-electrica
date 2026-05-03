'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MapPin, Users, Trash2, Power, PowerOff } from 'lucide-react'
import { updateSectorAction, deleteSectorAction, assignReaderToSectorAction } from './actions'
import type { Database } from '@/types/database'

type Sector = Database['public']['Tables']['sectors']['Row']
type Reader = { id: string; full_name: string | null; email: string; assigned_sector_id: string | null }

export function SectorsList({ initialSectors, readers }: { initialSectors: Sector[]; readers: Reader[] }) {
  const [sectors] = useState(initialSectors)
  const router = useRouter()

  const readersForSector = (sectorId: string) =>
    readers.filter(r => r.assigned_sector_id === sectorId)

  const unassignedReaders = readers.filter(r => !r.assigned_sector_id)

  const handleToggleActive = async (sector: Sector) => {
    try {
      await updateSectorAction(sector.id, { is_active: !sector.is_active })
      router.refresh()
    } catch {}
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este sector? Los clientes asignados quedarán sin sector.')) return
    try {
      await deleteSectorAction(id)
      router.refresh()
    } catch {}
  }

  const handleAssignReader = async (readerId: string, sectorId: string | null) => {
    try {
      await assignReaderToSectorAction(readerId, sectorId)
      router.refresh()
    } catch {}
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {sectors.map((sector) => {
        const assignedReaders = readersForSector(sector.id)
        return (
          <Card key={sector.id} className={!sector.is_active ? 'opacity-60' : ''}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muni-blue" />
                  <CardTitle className="text-base">{sector.name}</CardTitle>
                  <Badge variant="outline" className="text-xs font-mono">{sector.code}</Badge>
                  {!sector.is_active && <Badge variant="secondary">Inactivo</Badge>}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleToggleActive(sector)}>
                    {sector.is_active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(sector.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {sector.description && (
                <p className="text-xs text-muted-foreground">{sector.description}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1">
                  <Users className="h-3 w-3" /> Lecturadores Asignados
                </p>
                {assignedReaders.length > 0 ? (
                  <div className="space-y-1">
                    {assignedReaders.map(r => (
                      <div key={r.id} className="flex items-center justify-between text-sm bg-muted/50 rounded px-2 py-1">
                        <span>{r.full_name || r.email}</span>
                        <Button variant="ghost" size="sm" className="h-6 text-xs text-destructive"
                          onClick={() => handleAssignReader(r.id, null)}>
                          Desasignar
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Sin lecturador asignado</p>
                )}

                {unassignedReaders.length > 0 && (
                  <div className="mt-2">
                    <Select onValueChange={(val) => handleAssignReader(val as string, sector.id)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="+ Asignar lecturador" />
                      </SelectTrigger>
                      <SelectContent>
                        {unassignedReaders.map(r => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.full_name || r.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}

      {sectors.length === 0 && (
        <div className="col-span-2 text-center py-12 text-muted-foreground">
          No hay sectores registrados. Crea uno para empezar.
        </div>
      )}
    </div>
  )
}

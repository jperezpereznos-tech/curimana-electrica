'use client'

import { useState, useMemo, memo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MapPin, Users, Trash2, Power, PowerOff } from 'lucide-react'
import { updateSectorAction, deleteSectorAction, assignReaderToSectorAction } from './actions'
import dynamic from 'next/dynamic'

const ConfirmDialog = dynamic(() => import('@/components/confirm-dialog').then(m => ({ default: m.ConfirmDialog })))
import { toast } from 'sonner'
import type { Database } from '@/types/database'

type Sector = Database['public']['Tables']['sectors']['Row']
type Reader = { id: string; full_name: string | null; email: string; assigned_sector_id: string | null }

function SectorsListInner({ initialSectors, readers }: { initialSectors: Sector[]; readers: Reader[] }) {
  const [sectors] = useState(initialSectors)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [toggleTarget, setToggleTarget] = useState<Sector | null>(null)

  const readersBySectorId = useMemo(() => {
    const map = new Map<string, Reader[]>()
    for (const r of readers) {
      if (r.assigned_sector_id) {
        const list = map.get(r.assigned_sector_id)
        if (list) list.push(r)
        else map.set(r.assigned_sector_id, [r])
      }
    }
    return map
  }, [readers])

  const unassignedReaders = useMemo(() => readers.filter(r => !r.assigned_sector_id), [readers])

  const handleToggleActive = async (sector: Sector) => {
    const result = await updateSectorAction(sector.id, { is_active: !sector.is_active })
    if (result.success) {
      toast.success(sector.is_active ? 'Sector desactivado' : 'Sector activado')
    } else {
      toast.error(result.error || 'Error al cambiar estado del sector')
    }
  }

  const handleDelete = async (id: string) => {
    const result = await deleteSectorAction(id)
    if (result.success) {
      setDeleteTargetId(null)
      toast.success('Sector eliminado')
    } else {
      toast.error(result.error || 'Error al eliminar sector')
    }
  }

  const handleAssignReader = async (readerId: string, sectorId: string | null) => {
    const result = await assignReaderToSectorAction(readerId, sectorId)
    if (result.success) {
      toast.success(sectorId ? 'Lecturador asignado' : 'Lecturador desasignado')
    } else {
      toast.error(result.error || 'Error al asignar lecturador')
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {sectors.map((sector) => {
        const assignedReaders = readersBySectorId.get(sector.id) ?? []
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
                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={sector.is_active ? 'Desactivar sector' : 'Activar sector'} onClick={() => setToggleTarget(sector)}>
                    {sector.is_active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" aria-label="Eliminar sector" onClick={() => setDeleteTargetId(sector.id)}>
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
        <EmptyState message="No hay sectores registrados" illustration="sectors" description="Crea uno para empezar." />
      )}
      <ConfirmDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => { if (!open) setDeleteTargetId(null) }}
        title="Eliminar Sector"
        description="¿Eliminar este sector? Los clientes asignados quedarán sin sector."
        confirmLabel="Eliminar"
        destructive
        onConfirm={() => deleteTargetId && handleDelete(deleteTargetId)}
      />
      <ConfirmDialog
        open={!!toggleTarget}
        onOpenChange={(open) => { if (!open) setToggleTarget(null) }}
        title={toggleTarget?.is_active ? 'Desactivar Sector' : 'Activar Sector'}
        description={toggleTarget?.is_active ? '¿Desactivar este sector? Los lecturadores asignados no podrán ver suministros de este sector.' : '¿Activar este sector? Los lecturadores podrán ver suministros de este sector.'}
        confirmLabel={toggleTarget?.is_active ? 'Desactivar' : 'Activar'}
        destructive={!!toggleTarget?.is_active}
        onConfirm={() => toggleTarget && handleToggleActive(toggleTarget)}
      />
    </div>
  )
}
export const SectorsList = memo(SectorsListInner)
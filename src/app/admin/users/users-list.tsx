'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Shield, MapPin } from 'lucide-react'
import { updateUserRoleAction, assignSectorToUserAction } from './actions'

const ROLES = [
  { id: 'admin', label: 'Administrador', color: 'bg-red-100 text-red-800' },
  { id: 'cashier', label: 'Cajero', color: 'bg-blue-100 text-blue-800' },
  { id: 'meter_reader', label: 'Lecturador', color: 'bg-green-100 text-green-800' },
] as const

export function UsersList({ users, sectors }: { users: any[]; sectors: any[] }) {
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleRoleChange = async (userId: string, role: string) => {
    setError(null)
    try {
      await updateUserRoleAction(userId, role)
      router.refresh()
    } catch (e: any) {
      setError(e.message || 'Error al cambiar rol')
    }
  }

  const handleSectorChange = async (userId: string, sectorId: string | null) => {
    setError(null)
    try {
      await assignSectorToUserAction(userId, sectorId)
      router.refresh()
    } catch (e: any) {
      setError(e.message || 'Error al asignar sector')
    }
  }

  const getRoleBadge = (role: string) => {
    const r = ROLES.find(ro => ro.id === role)
    return r || { label: role, color: 'bg-gray-100 text-gray-800' }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">{error}</div>
      )}

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Sector Asignado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  No hay usuarios registrados.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => {
                const roleInfo = getRoleBadge(user.role)
                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.full_name || 'Sin nombre'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={user.role}
                        onValueChange={(val) => handleRoleChange(user.id, val as string)}
                      >
                        <SelectTrigger className="w-[160px] h-8">
                          <SelectValue>
                            <Badge variant="outline" className={roleInfo.color}>
                              <Shield className="h-3 w-3 mr-1" />
                              {roleInfo.label}
                            </Badge>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map(r => (
                            <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {user.role === 'meter_reader' ? (
                        <Select
                          value={user.assigned_sector_id || '__none'}
                          onValueChange={(val) =>
                            handleSectorChange(user.id, val === '__none' ? null : val)
                          }
                        >
                          <SelectTrigger className="w-[180px] h-8">
                            <SelectValue>
                              {user.sectors ? (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {user.sectors.name}
                                </span>
                              ) : (
                                <span className="text-muted-foreground italic">Sin asignar</span>
                              )}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none">Sin asignar</SelectItem>
                            {sectors.map(s => (
                              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

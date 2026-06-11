'use client'

import { useState, memo } from 'react'
import {
 Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import dynamic from 'next/dynamic'

const ConfirmDialog = dynamic(() => import('@/components/confirm-dialog').then(m => ({ default: m.ConfirmDialog })))
import { Shield, MapPin, Trash2, KeyRound } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { updateUserRoleAction, assignSectorToUserAction, deleteUserAction, resetUserPasswordAction } from './actions'
import type { ProfileWithSector, SectorRow } from '@/types/views'

const ROLES = [
  { id: 'admin', label: 'Administrador', color: 'bg-destructive/10 text-destructive' },
  { id: 'cashier', label: 'Cajero', color: 'bg-muni-blue/10 text-muni-blue' },
  { id: 'meter_reader', label: 'Lecturador', color: 'bg-muni-green/10 text-muni-green' },
] as const

function UsersListInner({ users, sectors }: { users: ProfileWithSector[]; sectors: SectorRow[] }) {
 const [error, setError] = useState<string | null>(null)
 const [deleteTarget, setDeleteTarget] = useState<ProfileWithSector | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [passwordTarget, setPasswordTarget] = useState<ProfileWithSector | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  const handleRoleChange = async (userId: string, role: string) => {
    setError(null)
    try {
      const result = await updateUserRoleAction(userId, role)
      if (result.error) setError(result.error)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cambiar rol')
    }
  }

  const handleSectorChange = async (userId: string, sectorId: string | null) => {
    setError(null)
    try {
      const result = await assignSectorToUserAction(userId, sectorId)
      if (result.error) setError(result.error)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al asignar sector')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setError(null)
    try {
      const result = await deleteUserAction(deleteTarget.id)
      if (result.error) {
        setError(result.error)
      } else {
      setDeleteTarget(null)
    }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al eliminar usuario')
    } finally {
      setDeleting(false)
    }
  }

  const handleResetPassword = async () => {
    if (!passwordTarget) return
    setSavingPassword(true)
    setError(null)
    try {
      const result = await resetUserPasswordAction(passwordTarget.id, newPassword)
      if (result.error) {
        setError(result.error)
      } else {
        setPasswordTarget(null)
        setNewPassword('')
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cambiar contraseña')
    } finally {
      setSavingPassword(false)
    }
  }

 const getRoleBadge = (role: string) => {
 const r = ROLES.find(ro => ro.id === role)
    return r || { label: role, color: 'bg-muni-silver-light text-muni-silver-dark' }
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
 <TableHead className="w-[60px]" />
 </TableRow>
 </TableHeader>
 <TableBody>
 {users.length === 0 ? (
 <TableRow>
 <TableCell colSpan={5} className="h-24 text-center">
 No hay usuarios registrados.
 </TableCell>
 </TableRow>
 ) : (
 users.map((user) => {
 const roleInfo = getRoleBadge(user.role ?? '')
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
 value={user.role ?? ''}
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
 <TableCell>
  <div className="flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => { setPasswordTarget(user); setNewPassword(''); }}
          aria-label="Establecer contraseña"
        >
 <KeyRound className="h-4 w-4" />
 </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={() => setDeleteTarget(user)}
          aria-label="Eliminar usuario"
        >
 <Trash2 className="h-4 w-4" />
 </Button>
  </div>
 </TableCell>
 </TableRow>
 )
 })
 )}
 </TableBody>
 </Table>
 </div>

 <ConfirmDialog
 open={deleteTarget !== null}
 onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
 title="Eliminar usuario"
 description={`¿Estás seguro de eliminar a ${deleteTarget?.full_name || deleteTarget?.email}? Esta acción eliminará el usuario y su perfil permanentemente. Si el usuario tiene registros asociados (lecturas, pagos), la eliminación fallará.`}
 confirmLabel={deleting ? 'Eliminando...' : 'Eliminar'}
 onConfirm={handleDelete}
 destructive
 />

 <Dialog open={passwordTarget !== null} onOpenChange={(open) => { if (!open) { setPasswordTarget(null); setNewPassword(''); } }}>
  <DialogContent className="max-w-sm">
   <DialogHeader>
    <DialogTitle>Establecer contraseña</DialogTitle>
    <DialogDescription>
     Nueva contraseña para {passwordTarget?.full_name || passwordTarget?.email}
    </DialogDescription>
   </DialogHeader>
   <div className="space-y-3 py-2">
    <div className="space-y-2">
     <Label htmlFor="new-password">Nueva contraseña</Label>
     <Input
      id="new-password"
      type="text"
      value={newPassword}
      onChange={(e) => setNewPassword(e.target.value)}
      placeholder="Mínimo 8 caracteres"
      autoComplete="off"
     />
    </div>
   </div>
   <DialogFooter>
    <Button variant="outline" onClick={() => { setPasswordTarget(null); setNewPassword(''); }}>Cancelar</Button>
    <Button onClick={handleResetPassword} disabled={savingPassword || newPassword.length < 8}>
     {savingPassword ? 'Guardando...' : 'Guardar'}
    </Button>
   </DialogFooter>
  </DialogContent>
 </Dialog>
 </div>
 )
}
export const UsersList = memo(UsersListInner)

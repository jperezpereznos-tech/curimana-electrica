'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { UserPlus } from 'lucide-react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { inviteUserAction } from './actions'

const inviteSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  full_name: z.string().min(3, 'Nombre requerido'),
  role: z.string().min(1, 'Rol requerido'),
})

type InviteFormValues = z.infer<typeof inviteSchema>

const ROLES = [
  { id: 'meter_reader', label: 'Lecturador' },
  { id: 'cashier', label: 'Cajero' },
  { id: 'admin', label: 'Administrador' },
]

export function InviteUserDialog({ sectors }: { sectors: any[] }) {
  const [open, setOpen] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const router = useRouter()

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '', password: '', full_name: '', role: 'meter_reader' },
  })

  const onSubmit = async (values: InviteFormValues) => {
    setServerError(null)
    try {
      await inviteUserAction(values.email, values.password, values.full_name, values.role)
      setOpen(false)
      form.reset()
      router.refresh()
    } catch (e: any) {
      setServerError(e.message || 'Error al invitar usuario')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button className="gap-2">
          <UserPlus className="h-4 w-4" /> Nuevo Usuario
        </Button>
      } />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invitar Usuario</DialogTitle>
          <DialogDescription>
            Crea una cuenta nueva y asígnale un rol.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {serverError && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
              {serverError}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="full_name">Nombre Completo</Label>
            <Input id="full_name" {...form.register('full_name')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Correo Electrónico</Label>
            <Input id="email" type="email" {...form.register('email')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" type="password" {...form.register('password')} />
          </div>

          <div className="space-y-2">
            <Label>Rol</Label>
            <Select
              onValueChange={(val) => form.setValue('role', (val ?? '') as string)}
              value={form.watch('role')}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar">
                  {ROLES.find(r => r.id === form.watch('role'))?.label}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {ROLES.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit">Crear Usuario</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

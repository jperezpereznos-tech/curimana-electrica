'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { UserPlus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { registerCustomerAction } from './actions'

const customerSchema = z.object({
  supply_number: z.string().min(1, 'Número de suministro requerido'),
  full_name: z.string().min(5, 'Nombre completo requerido'),
  document_number: z.string().min(8, 'DNI/RUC inválido'),
  address: z.string().min(5, 'Dirección requerida'),
  sector_id: z.string().min(1, 'Sector requerido'),
  phone: z.string().optional(),
  tariff_id: z.string().min(1, 'Tarifa requerida'),
  connection_type: z.enum(['monofásico', 'trifásico']),
})

type CustomerFormValues = z.infer<typeof customerSchema>

export function CreateCustomerDialog({ tariffs, sectors }: { tariffs: any[]; sectors: any[] }) {
  const [open, setOpen] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const router = useRouter()
  
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      supply_number: '',
      full_name: '',
      document_number: '',
      address: '',
      sector_id: '',
      phone: '',
      tariff_id: '',
      connection_type: 'monofásico',
    },
  })

  const onSubmit = async (values: CustomerFormValues) => {
    setServerError(null)
    try {
      await registerCustomerAction({
        ...values,
        is_active: true,
        current_debt: 0
      })
      setOpen(false)
      form.reset()
      router.refresh()
    } catch (error: any) {
      const msg = error?.code === '42501'
        ? 'No tiene permisos para realizar esta acción'
        : (error.message || 'Error al registrar cliente')
      setServerError(msg)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button className="gap-2">
          <UserPlus className="h-4 w-4" /> Nuevo Cliente
        </Button>
      } />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar Nuevo Cliente</DialogTitle>
          <DialogDescription>
            Ingresa los datos personales y de conexión para el nuevo suministro.
          </DialogDescription>
        </DialogHeader>

    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {serverError && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
          {serverError}
        </div>
      )}
        <div className="space-y-2">
          <Label htmlFor="supply_number">N° de Suministro</Label>
          <Input id="supply_number" placeholder="Ej: 123456789" {...form.register('supply_number')} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="full_name">Nombre Completo</Label>
          <Input id="full_name" {...form.register('full_name')} />
        </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="document_number">DNI / RUC</Label>
              <Input id="document_number" {...form.register('document_number')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono (opcional)</Label>
              <Input id="phone" {...form.register('phone')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Sector</Label>
              <Select
                onValueChange={(val) => form.setValue('sector_id', (val ?? '') as string)}
                value={form.watch('sector_id')}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar">
                    {sectors.find(s => s.id === form.watch('sector_id'))?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {sectors.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Dirección</Label>
              <Input id="address" {...form.register('address')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tarifa Asignada</Label>
              <Select
                onValueChange={(val) => form.setValue('tariff_id', (val ?? '') as string)}
                value={form.watch('tariff_id')}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar">
                    {tariffs.find(t => t.id === form.watch('tariff_id'))?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {tariffs.filter(t => t.is_active).map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo Conexión</Label>
              <Select
                onValueChange={(val) => form.setValue('connection_type', (val ?? 'monofásico') as any)}
                value={form.watch('connection_type')}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar">
                    {form.watch('connection_type') === 'monofásico' ? 'Monofásico' : 'Trifásico'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monofásico">Monofásico</SelectItem>
                  <SelectItem value="trifásico">Trifásico</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Registrar Suministro</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

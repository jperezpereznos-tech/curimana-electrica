'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Pencil } from 'lucide-react'
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
import { updateCustomerAction } from './actions'

const customerSchema = z.object({
  full_name: z.string().min(5, 'Nombre completo requerido'),
  document_number: z.string().min(8, 'DNI/RUC inválido'),
  address: z.string().min(5, 'Dirección requerida'),
  sector_id: z.string().min(1, 'Sector requerido'),
  phone: z.string().optional(),
  tariff_id: z.string().min(1, 'Tarifa requerida'),
  connection_type: z.enum(['monofásico', 'trifásico']),
})

type CustomerFormValues = z.infer<typeof customerSchema>

interface EditCustomerDialogProps {
  customer: any
  tariffs: any[]
  sectors: any[]
  trigger?: React.ReactNode
}

export function EditCustomerDialog({ customer, tariffs, sectors, trigger }: EditCustomerDialogProps) {
  const [open, setOpen] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const router = useRouter()

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
  defaultValues: {
    full_name: customer.full_name || '',
    document_number: customer.document_number || '',
    address: customer.address || '',
    sector_id: customer.sector_id || '',
    phone: customer.phone || '',
    tariff_id: customer.tariff_id || '',
    connection_type: customer.connection_type || 'monofásico',
  },
})

  useEffect(() => {
    if (open) {
      form.reset({
        full_name: customer.full_name || '',
        document_number: customer.document_number || '',
        address: customer.address || '',
        sector_id: customer.sector_id || '',
        phone: customer.phone || '',
        tariff_id: customer.tariff_id || '',
        connection_type: customer.connection_type || 'monofásico',
      })
      setServerError(null)
    }
  }, [open, customer, form])

  const onSubmit = async (values: CustomerFormValues) => {
    setServerError(null)
    try {
      await updateCustomerAction(customer.id, values)
      setOpen(false)
      router.refresh()
    } catch (error: any) {
      const msg = error?.code === '42501'
        ? 'No tiene permisos para realizar esta acción'
        : (error.message || 'Error al actualizar cliente')
      setServerError(msg)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger nativeButton={!trigger} render={
      (trigger || (
        <Button variant="ghost" size="sm" className="gap-1">
          <Pencil className="h-3 w-3" /> Editar
        </Button>
      )) as React.ReactElement
    } />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Cliente</DialogTitle>
          <DialogDescription>
            Modifica los datos del suministro {customer.supply_number}.
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
            {form.formState.errors.full_name && (
              <p className="text-xs text-destructive">{form.formState.errors.full_name.message}</p>
            )}
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
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
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
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
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
            <Button type="submit">Guardar Cambios</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

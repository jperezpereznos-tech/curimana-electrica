'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Pencil, Trash2 } from 'lucide-react'
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
import { updateTariffAction } from './actions'

const tierSchema = z.object({
  min_kwh: z.coerce.number().min(0),
  max_kwh: z.coerce.number().nullable().optional(),
  price_per_kwh: z.coerce.number().min(0),
})

const tariffSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  connection_type: z.enum(['monofásico', 'trifásico']),
  tiers: z.array(tierSchema).min(1, 'Debe haber al menos un tramo'),
})

interface EditTariffDialogProps {
  tariff: any
  trigger?: React.ReactNode
}

export function EditTariffDialog({ tariff, trigger }: EditTariffDialogProps) {
  const [open, setOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const router = useRouter()

  const form = useForm({
    resolver: zodResolver(tariffSchema),
    defaultValues: {
      name: tariff.name || '',
      connection_type: tariff.connection_type || 'monofásico',
      tiers: tariff.tariff_tiers?.length
        ? tariff.tariff_tiers
            .sort((a: any, b: any) => a.order_index - b.order_index)
            .map((t: any) => ({
              min_kwh: t.min_kwh,
              max_kwh: t.max_kwh,
              price_per_kwh: t.price_per_kwh,
            }))
        : [{ min_kwh: 0, max_kwh: null, price_per_kwh: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'tiers',
  })

  useEffect(() => {
    if (open) {
      form.reset({
        name: tariff.name || '',
        connection_type: tariff.connection_type || 'monofásico',
        tiers: tariff.tariff_tiers?.length
          ? tariff.tariff_tiers
              .sort((a: any, b: any) => a.order_index - b.order_index)
              .map((t: any) => ({
                min_kwh: t.min_kwh,
                max_kwh: t.max_kwh,
                price_per_kwh: t.price_per_kwh,
              }))
          : [{ min_kwh: 0, max_kwh: null, price_per_kwh: 0 }],
      })
      setFormError(null)
    }
  }, [open, tariff, form])

  const onSubmit = async (values: any) => {
    setFormError(null)
    try {
      await updateTariffAction(
        tariff.id,
        {
          name: values.name,
          connection_type: values.connection_type,
        },
        values.tiers.map((t: { min_kwh: number; max_kwh: number | null | undefined; price_per_kwh: number }, i: number) => ({
          ...t,
          max_kwh: t.max_kwh || null,
          order_index: i + 1,
        }))
      )
      setOpen(false)
      router.refresh()
    } catch (error: any) {
      const msg = error.message || 'Error al actualizar la tarifa'
      if (msg.includes('Lock') || msg.includes('lock')) {
        setFormError('Error de conexión. Por favor intenta nuevamente.')
      } else {
        setFormError(msg)
      }
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Tarifa</DialogTitle>
          <DialogDescription>
            Modifica el nombre y los tramos de consumo para esta tarifa.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre de la Tarifa</Label>
              <Input id="name" placeholder="Ej: Residencial BTSB" {...form.register('name')} />
{form.formState.errors.name && (
          <p className="text-xs text-destructive">{String(form.formState.errors.name.message)}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Tipo de Conexión</Label>
              <Select
                onValueChange={(val) => form.setValue('connection_type', (val ?? 'monofásico') as any)}
                value={form.watch('connection_type')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monofásico">Monofásico</SelectItem>
                  <SelectItem value="trifásico">Trifásico</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Tramos de Consumo</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ min_kwh: 0, max_kwh: null, price_per_kwh: 0 })}
              >
                Agregar Tramo
              </Button>
            </div>
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-4 gap-2 items-end border p-3 rounded-lg bg-muted/50">
                <div className="space-y-1">
                  <Label className="text-xs">Min kWh</Label>
                  <Input type="number" {...form.register(`tiers.${index}.min_kwh`)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Max kWh (vacio = ilimitado)</Label>
                  <Input type="number" {...form.register(`tiers.${index}.max_kwh`)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Precio S/</Label>
                  <Input type="number" step="0.01" {...form.register(`tiers.${index}.price_per_kwh`)} />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() => remove(index)}
                  disabled={fields.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
{form.formState.errors.tiers && (
        <p className="text-xs text-destructive">{String(form.formState.errors.tiers.message)}</p>
            )}
          </div>
          {formError && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-md">
              {formError}
            </div>
          )}
          <DialogFooter>
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

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Plus, Trash2 } from 'lucide-react'
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
import { tariffService } from '@/services/tariff-service'

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

export function CreateTariffDialog() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  
  const form = useForm({
    resolver: zodResolver(tariffSchema),
    defaultValues: {
      name: '',
      connection_type: 'monofásico' as const,
      tiers: [{ min_kwh: 0, max_kwh: null, price_per_kwh: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'tiers',
  })

  const [formError, setFormError] = useState<string | null>(null)

  const onSubmit = async (values: any) => {
    setFormError(null)
    try {
      await tariffService.createTariffWithValidation(
        { 
          name: values.name, 
          connection_type: values.connection_type,
          is_active: true
        },
        values.tiers.map((t: { min_kwh: number; max_kwh: number | null | undefined; price_per_kwh: number }, i: number) => ({
          ...t,
          max_kwh: t.max_kwh || null,
          order_index: i + 1
        }))
      )
      setOpen(false)
      form.reset()
      setFormError(null)
      router.refresh()
    } catch (error: any) {
      const msg = error.message || 'Error al crear la tarifa'
      // Filter out internal lock errors and show a user-friendly message
      if (msg.includes('Lock') || msg.includes('lock')) {
        setFormError('Error de conexión. Por favor intenta nuevamente.')
      } else {
        setFormError(msg)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Nueva Tarifa
        </Button>
      } />
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Crear Nueva Tarifa</DialogTitle>
          <DialogDescription>
            Define el nombre y los tramos de consumo para esta tarifa.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre de la Tarifa</Label>
              <Input
                id="name"
                placeholder="Ej: Residencial BTSB"
                {...form.register('name')}
              />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Tipo de Conexión</Label>
              <Select
                onValueChange={(val) => form.setValue('connection_type', val as any)}
                defaultValue={form.getValues('connection_type')}
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
                  <Input
                    type="number"
                    {...form.register(`tiers.${index}.min_kwh`)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Max kWh (vacio = ilimitado)</Label>
                  <Input
                    type="number"
                    {...form.register(`tiers.${index}.max_kwh`)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Precio S/</Label>
                  <Input
                    type="number"
                    step="0.01"
                    {...form.register(`tiers.${index}.price_per_kwh`)}
                  />
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
              <p className="text-xs text-destructive">{form.formState.errors.tiers.message}</p>
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
            <Button type="submit">Guardar Tarifa</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

'use client'

import { useState } from 'react'
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
import { registerTariffAction } from './actions'

const tierSchema = z.object({
  min_kwh: z.number().min(0),
  max_kwh: z.union([z.number(), z.nan()]).nullable().optional()
    .transform(v => (v === null || v === undefined || Number.isNaN(v)) ? null : v),
  price_per_kwh: z.union([z.number(), z.nan()]).optional()
    .transform(v => (v === undefined || Number.isNaN(v)) ? 0 : v)
    .pipe(z.number().min(0, 'Precio requerido')),
})

const tariffSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  connection_type: z.enum(['monofásico', 'trifásico']),
  tiers: z.array(tierSchema).min(1, 'Debe haber al menos un tramo'),
})

type TariffFormValues = z.input<typeof tariffSchema>

function getNextMinKwh(tiers: { min_kwh: number; max_kwh?: number | null | undefined }[]): number {
  if (tiers.length === 0) return 0
  const lastTier = tiers[tiers.length - 1]
  const lastMax = lastTier.max_kwh
  if (lastMax == null || isNaN(lastMax)) return 0
  return lastMax + 1
}

export function CreateTariffDialog() {
  const [open, setOpen] = useState(false)

  const form = useForm<TariffFormValues>({
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

  const onSubmit = async (values: TariffFormValues) => {
    setFormError(null)
    const result = await registerTariffAction(
      {
        name: values.name,
        connection_type: values.connection_type,
        is_active: true
      },
      values.tiers.map((t, i) => ({
        min_kwh: t.min_kwh,
        max_kwh: t.max_kwh ?? null,
        price_per_kwh: t.price_per_kwh,
        order_index: i + 1,
      }))
    )
    if (result.success) {
      setOpen(false)
      form.reset()
      setFormError(null)
    } else {
      const msg = result.error || 'Error al crear la tarifa'
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
                onValueChange={(val) => form.setValue('connection_type', (val ?? 'monofásico') as 'monofásico' | 'trifásico')}
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
                onClick={() => append({ min_kwh: getNextMinKwh(form.getValues('tiers')), max_kwh: null, price_per_kwh: 0 })}
              >
                <Plus className="h-4 w-4 mr-1" /> Agregar Tramo
              </Button>
            </div>

            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end border p-3 rounded-lg bg-muted/50">
                <div className="space-y-1">
                  <Label className="text-xs">Min kWh</Label>
                  <Input
                    type="number"
                    readOnly={index === 0}
                    className={index === 0 ? 'bg-muted cursor-not-allowed' : ''}
                    {...form.register(`tiers.${index}.min_kwh`, { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{index === fields.length - 1 ? 'Max kWh (vacío = ilimitado)' : 'Max kWh'}</Label>
                  <Input
                    type="number"
                    {...form.register(`tiers.${index}.max_kwh`, { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Precio S/</Label>
                  <Input
                    type="number"
                    step="0.01"
                    {...form.register(`tiers.${index}.price_per_kwh`, { valueAsNumber: true })}
                  />
                </div>
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="text-destructive"
      onClick={() => remove(index)}
      disabled={fields.length === 1}
      aria-label="Eliminar tramo"
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

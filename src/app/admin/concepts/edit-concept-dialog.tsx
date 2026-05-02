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
import { updateConceptAction } from './actions'

const conceptSchema = z.object({
  code: z.string().min(2, 'Código requerido'),
  name: z.string().min(3, 'Nombre requerido'),
  description: z.string().optional(),
  amount: z.number().min(0),
  type: z.enum(['fixed', 'percentage', 'per_kwh']),
  applies_to_tariff_id: z.string().optional(),
})

type ConceptFormValues = z.infer<typeof conceptSchema>

interface EditConceptDialogProps {
  concept: any
  tariffs?: any[]
  trigger?: React.ReactNode
}

export function EditConceptDialog({ concept, tariffs = [], trigger }: EditConceptDialogProps) {
  const [open, setOpen] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const router = useRouter()

  const form = useForm<ConceptFormValues>({
    resolver: zodResolver(conceptSchema),
    defaultValues: {
      code: concept.code || '',
      name: concept.name || '',
      description: concept.description || '',
      amount: concept.amount || 0,
      type: concept.type || 'fixed',
      applies_to_tariff_id: concept.applies_to_tariff_id || 'all',
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        code: concept.code || '',
        name: concept.name || '',
        description: concept.description || '',
        amount: concept.amount || 0,
        type: concept.type || 'fixed',
        applies_to_tariff_id: concept.applies_to_tariff_id || 'all',
      })
      setServerError(null)
    }
  }, [open, concept, form])

  const onSubmit = async (values: ConceptFormValues) => {
    setServerError(null)
    try {
      await updateConceptAction(concept.id, {
        ...values,
        applies_to_tariff_id: values.applies_to_tariff_id === 'all' ? null : values.applies_to_tariff_id,
      })
      setOpen(false)
      router.refresh()
    } catch (error: any) {
      const msg = error?.code === '42501'
        ? 'No tiene permisos para realizar esta acción'
        : (error.message || 'Error al actualizar el concepto')
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Concepto de Cobro</DialogTitle>
          <DialogDescription>
            Modifica los datos del concepto &ldquo;{concept.name}&rdquo;.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {serverError && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
              {serverError}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Código</Label>
              <Input id="code" placeholder="Ej: ALUM" {...form.register('code')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" placeholder="Ej: Alumbrado Público" {...form.register('name')} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Input id="description" {...form.register('description')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Cargo</Label>
              <Select
                onValueChange={(val) => form.setValue('type', (val ?? 'fixed') as any)}
                value={form.watch('type')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Monto Fijo (S/)</SelectItem>
                  <SelectItem value="percentage">Porcentaje (%)</SelectItem>
                  <SelectItem value="per_kwh">Por kWh (S/)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Monto / Valor</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                {...form.register('amount', { valueAsNumber: true })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Aplica a Tarifa</Label>
            <Select
              onValueChange={(val) => form.setValue('applies_to_tariff_id', val ?? 'all')}
              value={form.watch('applies_to_tariff_id') || 'all'}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tarifa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las tarifas</SelectItem>
                {tariffs.map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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

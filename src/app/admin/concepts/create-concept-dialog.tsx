'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Plus } from 'lucide-react'
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
import { conceptService } from '@/services/concept-service'

const conceptSchema = z.object({
  code: z.string().min(2, 'Código requerido'),
  name: z.string().min(3, 'Nombre requerido'),
  description: z.string().optional(),
  amount: z.number().min(0),
  type: z.enum(['fixed', 'percentage', 'per_kwh']),
})

type ConceptFormValues = z.infer<typeof conceptSchema>

export function CreateConceptDialog() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  
  const form = useForm<ConceptFormValues>({
    resolver: zodResolver(conceptSchema),
    defaultValues: {
      code: '',
      name: '',
      description: '',
      amount: 0,
      type: 'fixed',
    },
  })

  const onSubmit = async (values: ConceptFormValues) => {
    try {
      await conceptService.createConcept({
        ...values,
        is_active: true
      })
      setOpen(false)
      form.reset()
      router.refresh()
    } catch (error: any) {
      alert(error.message || 'Error al crear el concepto')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Nuevo Concepto
        </Button>
      } />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear Concepto de Cobro</DialogTitle>
          <DialogDescription>
            Configura un nuevo cargo para los recibos.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                onValueChange={(val) => form.setValue('type', val as any)}
                defaultValue={form.getValues('type')}
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
                {...form.register('amount')}
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Guardar Concepto</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

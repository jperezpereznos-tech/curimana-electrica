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
import { createSectorAction } from './actions'

const sectorSchema = z.object({
  name: z.string().min(3, 'Nombre requerido'),
  code: z.string().min(1, 'Código requerido').max(5, 'Máximo 5 caracteres'),
  description: z.string().optional(),
})

type SectorFormValues = z.infer<typeof sectorSchema>

export function CreateSectorDialog() {
  const [open, setOpen] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const router = useRouter()

  const form = useForm<SectorFormValues>({
    resolver: zodResolver(sectorSchema),
    defaultValues: { name: '', code: '', description: '' },
  })

  const onSubmit = async (values: SectorFormValues) => {
    setServerError(null)
    try {
      await createSectorAction(values)
      setOpen(false)
      form.reset()
      router.refresh()
    } catch (error: any) {
      setServerError(error.message || 'Error al crear sector')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Nuevo Sector
        </Button>
      } />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Crear Sector</DialogTitle>
          <DialogDescription>
            Agrega un nuevo sector para la asignación de rutas de lectura.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {serverError && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
              {serverError}
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1 space-y-2">
              <Label htmlFor="code">Código</Label>
              <Input id="code" placeholder="S1" {...form.register('code')} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" placeholder="Sector 1 - Centro" {...form.register('name')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción (opcional)</Label>
            <Input id="description" placeholder="Zona central del distrito" {...form.register('description')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit">Crear Sector</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

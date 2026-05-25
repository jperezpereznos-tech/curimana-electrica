'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { UserPlus, ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { registerCustomerAction } from './actions'
import type { TariffRow, SectorRow } from '@/types/views'

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

const steps = [
  { id: 1, label: 'Personal', fields: ['supply_number', 'full_name', 'document_number', 'phone'] as const },
  { id: 2, label: 'Conexión', fields: ['address', 'sector_id', 'tariff_id', 'connection_type'] as const },
]

export function CreateCustomerDialog({ tariffs, sectors }: { tariffs: TariffRow[]; sectors: SectorRow[] }) {
  const [open, setOpen] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [step, setStep] = useState(0)

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

  const currentStep = steps[step]

  const validateStep = async (): Promise<boolean> => {
    const result = await form.trigger(currentStep.fields as unknown as (keyof CustomerFormValues)[])
    return result
  }

  const nextStep = async () => {
    const valid = await validateStep()
    if (valid && step < steps.length - 1) setStep(step + 1)
  }

  const prevStep = () => {
    if (step > 0) setStep(step - 1)
  }

  const onSubmit = async (values: CustomerFormValues) => {
    setServerError(null)
    const result = await registerCustomerAction({
      ...values,
      is_active: true,
      current_debt: 0,
    })
    if (result.success) {
      setOpen(false)
      form.reset()
      setStep(0)
    } else {
      setServerError(result.error || 'Error al registrar cliente')
    }
  }

  const handleClose = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) {
      setStep(0)
      setServerError(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger render={
        <Button className="gap-2">
          <UserPlus className="h-4 w-4" /> Nuevo Cliente
        </Button>
      } />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar Nuevo Cliente</DialogTitle>
          <DialogDescription>
            {`Paso ${step + 1} de ${steps.length}: ${currentStep.label}`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-1.5 mb-2">
          {steps.map((s, i) => (
            <div
              key={s.id}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? 'bg-muni-blue' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {serverError && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
              {serverError}
            </div>
          )}

          {step === 0 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-200">
              <div className="space-y-2">
                <Label htmlFor="supply_number">N° de Suministro</Label>
                <Input id="supply_number" placeholder="Ej: 123456789" {...form.register('supply_number')} />
                {form.formState.errors.supply_number && (
                  <p className="text-xs text-destructive">{form.formState.errors.supply_number.message}</p>
                )}
              </div>
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
                  {form.formState.errors.document_number && (
                    <p className="text-xs text-destructive">{form.formState.errors.document_number.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono (opcional)</Label>
                  <Input id="phone" {...form.register('phone')} />
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-200">
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
                  {form.formState.errors.sector_id && (
                    <p className="text-xs text-destructive">{form.formState.errors.sector_id.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Dirección</Label>
                  <Input id="address" {...form.register('address')} />
                  {form.formState.errors.address && (
                    <p className="text-xs text-destructive">{form.formState.errors.address.message}</p>
                  )}
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
                  {form.formState.errors.tariff_id && (
                    <p className="text-xs text-destructive">{form.formState.errors.tariff_id.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Tipo Conexión</Label>
                  <Select
                    onValueChange={(val) => form.setValue('connection_type', (val ?? 'monofásico') as 'monofásico' | 'trifásico')}
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

              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg text-sm">
                <CheckCircle2 className="h-4 w-4 text-muni-blue flex-shrink-0" />
                <span>Verifica los datos antes de registrar.</span>
              </div>
            </div>
          )}

          <DialogFooter className="mt-6 gap-2">
            {step > 0 && (
              <Button type="button" variant="outline" onClick={prevStep} className="gap-1">
                <ArrowLeft className="h-4 w-4" /> Anterior
              </Button>
            )}
            {step < steps.length - 1 ? (
              <Button type="button" onClick={nextStep} className="gap-1 ml-auto">
                Siguiente <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" className="gap-1 ml-auto">
                <CheckCircle2 className="h-4 w-4" /> Registrar Suministro
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

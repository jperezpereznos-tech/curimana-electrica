'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Save, Building2, Settings } from 'lucide-react'
import { updateMunicipalityConfigAction } from './actions'
import { Database } from '@/types/database'

type ConfigRow = Database['public']['Tables']['municipality_config']['Row']

export function ConfigForm({ config }: { config: ConfigRow | null }) {
  const [name, setName] = useState(config?.name || '')
  const [ruc, setRuc] = useState(config?.ruc || '')
  const [address, setAddress] = useState(config?.address || '')
  const [billingCutDay, setBillingCutDay] = useState(config?.billing_cut_day?.toString() || '26')
  const [paymentGraceDays, setPaymentGraceDays] = useState(config?.payment_grace_days?.toString() || '20')
  const [logoUrl, setLogoUrl] = useState(config?.logo_url || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSave = async () => {
    setError(null)
    setSuccess(false)

    if (!name.trim()) { setError('El nombre es obligatorio'); return }
    if (!ruc.trim()) { setError('El RUC es obligatorio'); return }
if (!/^\d{11}$/.test(ruc.trim())) { setError('El RUC debe tener exactamente 11 digitos'); return }
    if (!address.trim()) { setError('La direccion es obligatoria'); return }
    const cutDay = parseInt(billingCutDay)
    const graceDays = parseInt(paymentGraceDays)
    if (isNaN(cutDay) || cutDay < 1 || cutDay > 31) { setError('Dia de corte debe ser entre 1 y 31'); return }
    if (isNaN(graceDays) || graceDays < 0) { setError('Dias de gracia debe ser mayor o igual a 0'); return }

    setLoading(true)
    try {
      const result = await updateMunicipalityConfigAction({
        name: name.trim(),
        ruc: ruc.trim(),
        address: address.trim(),
        billing_cut_day: cutDay,
        payment_grace_days: graceDays,
        logo_url: logoUrl.trim() || null,
      })
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid gap-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4" /> Datos Institucionales
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre de la Municipalidad</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Municipalidad Distrital de Curimana" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ruc">RUC</Label>
              <Input id="ruc" value={ruc} onChange={(e) => setRuc(e.target.value)} placeholder="20123456789" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="logo_url">URL Logo (opcional)</Label>
              <Input id="logo_url" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Direccion</Label>
            <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Plaza de Armas S/N, Curimana" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="h-4 w-4" /> Parametros de Facturacion
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="billing_cut_day">Dia de Corte (mes)</Label>
              <Input id="billing_cut_day" type="number" min={1} max={31} value={billingCutDay} onChange={(e) => setBillingCutDay(e.target.value)} />
              <p className="text-xs text-muted-foreground">Dia del mes en que se cierra la lectura para facturar.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment_grace_days">Dias de Gracia para Pago</Label>
              <Input id="payment_grace_days" type="number" min={0} value={paymentGraceDays} onChange={(e) => setPaymentGraceDays(e.target.value)} />
              <p className="text-xs text-muted-foreground">Dias despues del corte antes de considerar el recibo vencido.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">{error}</div>
      )}

      {success && (
        <div className="bg-success/10 text-success text-sm p-3 rounded-lg border border-success/20">Configuracion guardada correctamente.</div>
      )}

      <Button onClick={handleSave} disabled={loading} className="gap-2">
        <Save className="h-4 w-4" /> {loading ? 'Guardando...' : 'Guardar Configuracion'}
      </Button>
    </div>
  )
}

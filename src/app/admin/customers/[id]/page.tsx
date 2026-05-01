import { AdminLayout } from '@/components/layouts/admin-layout'
import { getCustomerService } from '@/services/customer-service'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency, formatDate } from '@/lib/utils'
import { MapPin, Phone, User, CreditCard, Activity } from 'lucide-react'
import { notFound } from 'next/navigation'

export default async function CustomerDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const customerService = getCustomerService(supabase)
  const data = await customerService.getCustomerDetails(id)

  if (!data.customer) {
    notFound()
  }

  const { customer, readings, receipts } = data

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">{customer.full_name}</h2>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Badge variant="outline" className="font-mono">{customer.supply_number}</Badge>
                <span>•</span>
                <span>{customer.document_number}</span>
              </div>
            </div>
          </div>
          <Badge className="text-lg px-4 py-1" variant={customer.is_active ? 'default' : 'secondary'}>
            {customer.is_active ? 'Suministro Activo' : 'Suministro Inactivo'}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Ubicación y Contacto
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p><strong>Dirección:</strong> {customer.address}</p>
              <p><strong>Sector:</strong> {customer.sector}</p>
              <p className="flex items-center gap-1">
                <Phone className="h-3 w-3" /> {customer.phone || 'No registrado'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4" /> Configuración de Servicio
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p><strong>Tarifa:</strong> {customer.tariffs?.name}</p>
              <p className="capitalize"><strong>Conexión:</strong> {customer.connection_type}</p>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CreditCard className="h-4 w-4" /> Estado de Cuenta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {formatCurrency(customer.current_debt)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Deuda total acumulada a la fecha</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="readings" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="readings">Lecturas</TabsTrigger>
            <TabsTrigger value="receipts">Recibos</TabsTrigger>
            <TabsTrigger value="payments">Pagos</TabsTrigger>
          </TabsList>
          
          <TabsContent value="readings" className="mt-4">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Periodo</TableHead>
                    <TableHead>Anterior</TableHead>
                    <TableHead>Actual</TableHead>
                    <TableHead>Consumo (kWh)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {readings.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center">No hay registros</TableCell></TableRow>
                  ) : (
                    readings.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell>{formatDate(r.reading_date)}</TableCell>
                        <TableCell>{r.billing_periods?.name}</TableCell>
                        <TableCell>{r.previous_reading}</TableCell>
                        <TableCell>{r.current_reading}</TableCell>
                        <TableCell className="font-bold">{r.consumption}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="receipts" className="mt-4">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N° Recibo</TableHead>
                    <TableHead>Periodo</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receipts.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center">No hay registros</TableCell></TableRow>
                  ) : (
                    receipts.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono">{r.receipt_number}</TableCell>
                        <TableCell>{r.billing_periods?.name}</TableCell>
                        <TableCell>{formatDate(r.due_date)}</TableCell>
                        <TableCell className="font-bold">{formatCurrency(r.total_amount)}</TableCell>
                        <TableCell>
                          <Badge variant={r.status === 'paid' ? 'default' : 'destructive'}>
                            {r.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="mt-4">
            <Card>
              <div className="p-8 text-center text-muted-foreground">
                El historial detallado de pagos se implementará en la Fase 6.
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  )
}

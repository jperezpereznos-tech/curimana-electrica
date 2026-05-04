import { CashierLayout } from '@/components/layouts/cashier-layout'
import { getCashClosureService } from '@/services/cash-closure-service'
import { getPaymentService } from '@/services/payment-service'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Unlock,
  DollarSign,
  History
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { ClosureActions } from './closure-actions'
import { redirect } from 'next/navigation'

type SessionPayment = {
  id: string
  amount: number
  method: string | null
  receipt_id: string | null
  receipts: {
    receipt_number: number
    customers: {
      full_name: string
    } | null
  } | null
}

export default async function CashClosurePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const userId = user.id
  const cashClosureSvc = getCashClosureService(supabase)
  const paymentSvc = getPaymentService(supabase)
  const activeClosure = await cashClosureSvc.getActiveClosure(userId)

  let payments: SessionPayment[] = []
  let totalCollected = 0
  if (activeClosure) {
    const [sessionPayments, summary] = await Promise.all([
      paymentSvc.getPaymentsByCashier(userId, { from: activeClosure.created_at ?? undefined }),
      cashClosureSvc.getSessionSummary(userId, activeClosure.created_at ?? new Date().toISOString())
    ])
    payments = sessionPayments
    totalCollected = summary.total
  }

  return (
    <CashierLayout>
      <div className="flex flex-col gap-6 max-w-4xl mx-auto">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Cierre de Caja</h2>
          <p className="text-muted-foreground">Monitoreo de recaudación y finalización de turno.</p>
        </div>

        {!activeClosure ? (
          <Card className="border-dashed border-2">
            <CardContent className="py-20 flex flex-col items-center justify-center text-center">
              <Unlock className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-bold">Caja No Iniciada</h3>
              <p className="text-muted-foreground max-w-xs mb-6">
                No tienes una sesión de caja abierta. Debes iniciar una nueva sesión para empezar a cobrar.
              </p>
              <ClosureActions action="open" />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Saldo Inicial</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(activeClosure.opening_amount)}</div>
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold uppercase text-primary">Recaudado Hoy</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{formatCurrency(totalCollected)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Total en Caja</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(activeClosure.opening_amount + totalCollected)}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <History className="h-4 w-4" /> Historial de Pagos de la Sesión
                </CardTitle>
                <Badge variant="outline">{payments.length} transacciones</Badge>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {payments.length === 0 ? (
                    <div className="p-10 text-center text-muted-foreground italic">
                      Aún no se han registrado pagos en esta sesión.
                    </div>
                  ) : (
                    payments.map((p) => (
                      <div key={p.id} className="flex items-center justify-between p-4 hover:bg-muted/30">
                        <div className="flex items-center gap-3">
                          <div className="bg-success/10 p-2 rounded-full">
                            <DollarSign className="h-4 w-4 text-success" />
                          </div>
                          <div>
                            <p className="font-bold font-mono">REC {p.receipts?.receipt_number ?? '-'}</p>
                            <p className="text-xs text-muted-foreground">{p.receipts?.customers?.full_name ?? 'Cliente sin nombre'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{formatCurrency(p.amount)}</p>
                            <p className="text-[10px] text-muted-foreground uppercase">{p.method}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
              <CardFooter className="bg-muted/10 justify-center border-t py-6">
                <ClosureActions action="close" closureId={activeClosure.id} />
              </CardFooter>
            </Card>
          </div>
        )}
      </div>
    </CashierLayout>
  )
}

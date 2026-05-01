import { CashierLayout } from '@/components/layouts/cashier-layout'
import { cashClosureService, getCashClosureService } from '@/services/cash-closure-service'
import { createClient } from '@/lib/supabase/server'
import { CashierSearch } from './cashier-search'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { redirect } from 'next/navigation'

export default async function CashierDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const userId = user.id
  const svc = getCashClosureService(supabase)
  const activeClosure = await svc.getActiveClosure(userId)

  return (
    <CashierLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Caja Curimana</h2>
            <p className="text-muted-foreground">Búsqueda rápida de suministros y registro de cobros.</p>
          </div>
          {activeClosure && (
            <div className="bg-success/10 text-success px-4 py-2 rounded-full font-medium flex items-center gap-2 border border-success/20">
              <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
              Caja Abierta
            </div>
          )}
        </div>

        {!activeClosure ? (
          <div className="rounded-xl border border-dashed p-8 text-center space-y-4">
            <p className="text-muted-foreground">
              No tienes una caja abierta. Abre una sesion para registrar cobros.
            </p>
            <Button render={<Link href="/cashier/closure">Abrir caja</Link>} />
          </div>
        ) : (
          <CashierSearch closureId={activeClosure.id} />
        )}
      </div>
    </CashierLayout>
  )
}

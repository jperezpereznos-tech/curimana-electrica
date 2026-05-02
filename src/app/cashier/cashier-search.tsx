'use client'

import { useState, useRef, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Search, User, MapPin, AlertCircle, Receipt } from 'lucide-react'
import { searchCashierCustomerAction } from './actions'
import { formatCurrency } from '@/lib/utils'
import { PaymentModal } from './payment-modal'
import { Database } from '@/types/database'

type Customer = Database['public']['Tables']['customers']['Row']
type ReceiptItem = Database['public']['Tables']['receipts']['Row'] & {
  billing_periods: {
    name: string
  } | null
}

export function CashierSearch({ closureId }: { closureId: string }) {
  const [q, setQ] = useState('')
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [receipts, setReceipts] = useState<ReceiptItem[]>([])
  const [loading, setLoading] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const searchVersionRef = useRef(0)

  const handleSearch = useCallback(async () => {
    if (!q) return
    const version = ++searchVersionRef.current
    setLoading(true)
    setNotFound(false)
    try {
      const result = await searchCashierCustomerAction(q)
      if (version !== searchVersionRef.current) return

      if (result) {
        setCustomer(result.customer as any)
        setReceipts(result.receipts as any)
      } else {
        setCustomer(null)
        setReceipts([])
        setNotFound(true)
      }
    } catch {
      if (version !== searchVersionRef.current) return
      setNotFound(true)
    } finally {
      if (version === searchVersionRef.current) {
        setLoading(false)
      }
    }
  }, [q])

  return (
    <div className="space-y-6">
      <div className="flex gap-2 max-w-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="N° Suministro (9 dígitos)" 
            className="pl-10 text-lg h-12"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <Button size="lg" className="h-12 px-8" onClick={handleSearch} disabled={loading}>
          {loading ? 'Buscando...' : 'Buscar'}
    </Button>
    </div>

    {notFound && (
      <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg max-w-xl">
        Suministro no encontrado
      </div>
    )}

    {customer && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4">
          {/* Info Cliente */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4" /> Datos del Titular
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold">Suministro</p>
                <p className="text-xl font-mono font-bold text-primary">{customer.supply_number}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold">Nombre</p>
                <p className="font-medium">{customer.full_name}</p>
              </div>
              <div className="flex items-start gap-1">
                <MapPin className="h-3 w-3 mt-1 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">{customer.address} - {customer.sector}</p>
              </div>
              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground uppercase font-semibold">Deuda Total Exigible</p>
                <p className="text-3xl font-black text-destructive">{formatCurrency(customer.current_debt)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Recibos Pendientes */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Receipt className="h-4 w-4" /> Recibos Pendientes de Pago
              </CardTitle>
            </CardHeader>
            <CardContent>
              {receipts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground bg-muted/20 rounded-lg border-2 border-dashed">
                  <AlertCircle className="h-8 w-8 mb-2" />
                  <p>No hay recibos pendientes para este suministro.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {receipts.map((receipt) => (
                    <div key={receipt.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div>
                        <p className="font-bold font-mono">RECIBO {receipt.receipt_number}</p>
                        <p className="text-sm text-muted-foreground">{receipt.billing_periods?.name ?? 'Periodo no disponible'}</p>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground uppercase">Pendiente</p>
                          <p className="text-xl font-bold">{formatCurrency(receipt.total_amount - (receipt.paid_amount || 0))}</p>
                        </div>
                        <PaymentModal 
                          receipt={receipt} 
                          customer={customer} 
                          closureId={closureId}
                          onSuccess={handleSearch}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

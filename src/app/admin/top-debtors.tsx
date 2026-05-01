'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertCircle, ChevronRight, Eye } from 'lucide-react'
import { customerService } from '@/services/customer-service'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'

interface Debtor {
  id: string
  full_name: string
  supply_number: string
  current_debt: number | null
  sector: string | null
}

export function TopDebtors() {
  const [debtors, setDebtors] = useState<Debtor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadDebtors = useCallback(async () => {
    try {
      setError(null)
      const data = await customerService.getTopDebtors(5)
      setDebtors(data || [])
    } catch {
      setError('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDebtors()
  }, [loadDebtors])

  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            Top Deudores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">Cargando...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-destructive" />
          Top Deudores
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {debtors.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground text-sm">
            No hay clientes con deuda
          </div>
        ) : (
          debtors.map((debtor, index) => (
            <div
              key={debtor.id}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-medium">
                  {index + 1}
                </div>
                <div>
                  <p className="font-medium text-sm">{debtor.full_name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-mono">{debtor.supply_number}</span>
                    <Badge variant="outline" className="text-[10px]">{debtor.sector || 'Sin sector'}</Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-destructive">
                  {formatCurrency(debtor.current_debt || 0)}
                </span>
                <Link href={`/admin/customers/${debtor.id}`}>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Eye className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          ))
        )}
        
        <Button variant="ghost" className="w-full text-sm" render={<Link href="/admin/customers">Ver todos <ChevronRight className="h-4 w-4 ml-1" /></Link>} />
      </CardContent>
    </Card>
  )
}

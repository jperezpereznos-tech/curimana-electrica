'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, MapPin, Zap, ChevronRight, WifiOff } from 'lucide-react'
import { searchReaderCustomersAction, getReaderAssignedSectorIdAction } from '../actions'
import { useOfflineSync } from '@/hooks/use-offline-sync'
import { db } from '@/lib/db/dexie'
import Link from 'next/link'
import type { CustomerWithRelations } from '@/types/views'
import type { CustomerCache } from '@/lib/db/dexie'

type SearchResult = CustomerWithRelations | CustomerCache

export default function SearchPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [assignedSectorId, setAssignedSectorId] = useState<string | null>(null)
  const { syncCustomerCache } = useOfflineSync()

  useEffect(() => {
    getReaderAssignedSectorIdAction()
      .then(result => {
        if (result.success) setAssignedSectorId(result.data ?? null)
      })
      .catch((e) => { console.error('Error fetching assigned sector:', e) })
    if (navigator.onLine) void syncCustomerCache()
  }, [syncCustomerCache])

  const filterBySector = (customers: CustomerCache[]): CustomerCache[] => {
    if (!assignedSectorId) return customers
    return customers.filter(c => c.sector_id === assignedSectorId)
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (searchTerm.length < 2) return

    setLoading(true)
    setSearched(true)

    if (navigator.onLine) {
      const result = await searchReaderCustomersAction(searchTerm)
      if (result.success && result.data && result.data.length > 0) {
        setResults(result.data)
      } else {
        const cached = await db.customers_cache
          .where('supply_number')
          .startsWithIgnoreCase(searchTerm)
          .toArray()
        let filtered = filterBySector(cached)
        if (filtered.length === 0) {
          const byName = await db.customers_cache
            .filter(c => c.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
            .toArray()
          filtered = filterBySector(byName)
        }
        setResults(filtered)
      }
    } else {
      const cached = await db.customers_cache
        .where('supply_number')
        .startsWithIgnoreCase(searchTerm)
        .toArray()
      let filtered = filterBySector(cached)
      if (filtered.length === 0) {
        const byName = await db.customers_cache
          .filter(c => c.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
          .toArray()
        filtered = filterBySector(byName)
      }
      setResults(filtered)
    }

    setLoading(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold">Buscar Suministro</h2>

      {!navigator.onLine && (
        <div className="flex items-center gap-2 bg-amber-50 text-amber-700 px-3 py-2 rounded-lg text-sm">
          <WifiOff className="h-4 w-4" />
          Modo offline — buscando en caché local
        </div>
      )}

        <form onSubmit={handleSearch}>
          <Card>
            <CardContent className="p-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Nombre, suministro o documento..."
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={loading || searchTerm.length < 2}>
                  {loading ? 'Buscando...' : 'Buscar'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>

        {searched && results.length === 0 && !loading && (
          <div className="text-center py-8 text-muted-foreground">
            No se encontraron resultados
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {results.length} resultado(s) encontrado(s)
            </p>
            {results.map((customer) => (
              <Card key={customer.id} className="hover:border-primary/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{customer.full_name}</p>
                        {'is_active' in customer && customer.is_active ? (
                          <Badge variant="default" className="text-[10px]">Activo</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">Inactivo</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                        <Zap className="h-3 w-3" />
                        <span className="font-mono">{customer.supply_number}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <MapPin className="h-3 w-3" />
                        <span>{customer.address}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline">{'sectors' in customer && customer.sectors ? (customer.sectors as { name: string }).name : 'Sin sector'}</Badge>
                        <Badge variant="outline">{'connection_type' in customer ? (customer.connection_type || 'Monofásico') : 'Monofásico'}</Badge>
                      </div>
                    </div>
                    <Link href={`/reader/new?supply=${customer.supply_number}`}>
                      <Button variant="ghost" size="icon">
                        <ChevronRight className="h-5 w-5" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
  )
}

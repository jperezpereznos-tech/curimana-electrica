'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, MapPin, Zap, ChevronRight, WifiOff } from 'lucide-react'
import { searchReaderCustomersAction, getReaderAssignedSectorIdAction } from '../actions'
import { useOfflineSync } from '@/hooks/use-offline-sync'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { db } from '@/lib/db/dexie'
import Link from 'next/link'
import { EmptyState } from '@/components/empty-state'
import { StaggerReveal } from '@/components/stagger-reveal'
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
  const isOnline = useOnlineStatus()

  useEffect(() => {
    getReaderAssignedSectorIdAction()
      .then(result => {
        if (result.success) setAssignedSectorId(result.data ?? null)
      })
      .catch((e) => { console.error('Error fetching assigned sector:', e) })
    if (isOnline) void syncCustomerCache()
  }, [syncCustomerCache, isOnline])

  const filterBySector = (customers: CustomerCache[]): CustomerCache[] => {
    if (!assignedSectorId) return customers
    return customers.filter(c => c.sector_id === assignedSectorId)
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (searchTerm.length < 2) return

    setLoading(true)
    setSearched(true)

    if (isOnline) {
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
    <StaggerReveal>
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold">Buscar Suministro</h2>

      {!isOnline && (
        <div className="flex items-center gap-2 bg-muni-amber/5 text-muni-amber px-3 py-2 rounded-lg text-sm">
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
      <EmptyState message="No se encontraron resultados" illustration="search" />
        )}

        {results.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {results.length} resultado(s) encontrado(s)
            </p>
            {results.map((customer) => (
              <Card key={customer.id} className="hover:border-primary/50 hover:shadow-sm transition-all duration-200">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{customer.full_name}</p>
                {'is_active' in customer && (
                  <StatusBadge status={customer.is_active ? 'active' : 'inactive'} type="active" className="text-[10px]" />
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
                      <Button variant="ghost" size="icon" aria-label="Registrar lectura">
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
    </StaggerReveal>
  )
}

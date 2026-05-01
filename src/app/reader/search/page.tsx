'use client'

import { useState } from 'react'
import { ReaderLayout } from '@/components/layouts/reader-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, MapPin, Zap, ChevronRight } from 'lucide-react'
import { customerService } from '@/services/customer-service'
import Link from 'next/link'

export default function SearchPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (searchTerm.length < 2) return

    setLoading(true)
    setSearched(true)
    try {
      const customers = await customerService.searchCustomers(searchTerm)
      setResults(customers)
    } catch {
    } finally {
      setLoading(false)
    }
  }

  return (
    <ReaderLayout>
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-bold">Buscar Suministro</h2>

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
                        {customer.is_active ? (
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
                        <Badge variant="outline">{customer.sector || 'Sin sector'}</Badge>
                        <Badge variant="outline">{customer.connection_type || 'Monofásico'}</Badge>
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
    </ReaderLayout>
  )
}

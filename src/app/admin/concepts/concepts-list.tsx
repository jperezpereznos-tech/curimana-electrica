'use client'

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MoreHorizontal } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { conceptService } from '@/services/concept-service'
import { formatCurrency } from '@/lib/utils'

export function ConceptsList({ initialConcepts }: { initialConcepts: any[] }) {
  const [concepts, setConcepts] = useState(initialConcepts)
  const [actionError, setActionError] = useState<string | null>(null)

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    setActionError(null)
    try {
      await conceptService.toggleConceptStatus(id, !currentStatus)
      setConcepts(prev =>
        prev.map(c => c.id === id ? { ...c, is_active: !currentStatus } : c)
      )
    } catch {
      setActionError('Error al cambiar estado del concepto.')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este concepto?')) return
    setActionError(null)
    try {
      await conceptService.deleteConcept(id)
      setConcepts(prev => prev.filter(c => c.id !== id))
    } catch {
      setActionError('Error al eliminar el concepto.')
    }
  }

  return (
    <div className="rounded-md border bg-card">
      {actionError && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-t-lg border-b">
          {actionError}
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Monto</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {concepts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                No hay conceptos registrados.
              </TableCell>
            </TableRow>
          ) : (
            concepts.map((concept) => (
              <TableRow key={concept.id}>
                <TableCell className="font-mono text-xs">{concept.code}</TableCell>
                <TableCell className="font-medium">{concept.name}</TableCell>
                <TableCell className="capitalize">{concept.type}</TableCell>
                <TableCell>
                  {concept.type === 'percentage' ? `${concept.amount}%` : formatCurrency(concept.amount)}
                </TableCell>
                <TableCell>
                  <Badge variant={concept.is_active ? 'default' : 'secondary'}>
                    {concept.is_active ? 'Activo' : 'Inactivo'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
              <DropdownMenuTrigger render={
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              } />
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => handleToggleStatus(concept.id, concept.is_active)}>
                        {concept.is_active ? 'Desactivar' : 'Activar'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(concept.id)}>Eliminar</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

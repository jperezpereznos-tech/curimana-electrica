'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function CashierError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8 min-h-[60vh]">
      <AlertTriangle className="h-12 w-12 text-destructive" />
      <h2 className="text-2xl font-bold">Error en caja</h2>
      <p className="text-muted-foreground text-center max-w-md">
        Ocurrió un error al procesar la operación. Intenta de nuevo.
      </p>
      <Button onClick={reset}>Reintentar</Button>
    </div>
  )
}

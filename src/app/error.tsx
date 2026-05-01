'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function RootError({
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
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <AlertTriangle className="h-12 w-12 text-destructive" />
      <h2 className="text-2xl font-bold">Algo salió mal</h2>
      <p className="text-muted-foreground text-center max-w-md">
        Ocurrió un error inesperado. Intenta recargar la página.
      </p>
      <Button onClick={reset}>Intentar de nuevo</Button>
    </div>
  )
}

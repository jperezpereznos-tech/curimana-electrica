'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Zap, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

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
    <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-muted/20">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="relative mx-auto">
          <div className="h-28 w-28 rounded-3xl bg-destructive/10 flex items-center justify-center mx-auto">
            <AlertTriangle className="h-14 w-14 text-destructive" strokeWidth={1.25} />
          </div>
          <div className="absolute -top-2 -right-2 h-12 w-12 rounded-xl bg-muni-blue/10 flex items-center justify-center">
            <Zap className="h-6 w-6 text-muni-blue" strokeWidth={1.5} />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-3xl font-heading font-bold tracking-tight">Algo salió mal</h2>
          <p className="text-muted-foreground">
            Ocurrió un error inesperado. Intenta recargar la página o vuelve al inicio.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button onClick={reset} className="gap-2">
            Intentar de nuevo
          </Button>
          <Button variant="outline" nativeButton={false} render={<Link href="/"><ArrowLeft className="h-4 w-4 mr-2" />Volver al inicio</Link>} className="gap-2" />
        </div>

        {error.digest && (
          <p className="text-xs text-muted-foreground font-mono">
            Ref: {error.digest}
          </p>
        )}
      </div>
    </div>
  )
}

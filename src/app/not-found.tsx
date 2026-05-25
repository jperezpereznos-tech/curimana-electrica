import Link from 'next/link'
import { Zap, ArrowLeft, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-muted/20">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="relative mx-auto">
          <div className="h-32 w-32 rounded-3xl bg-muni-blue/10 flex items-center justify-center mx-auto">
            <Zap className="h-16 w-16 text-muni-blue" strokeWidth={1.25} />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-6xl font-heading font-black text-muni-blue/20 -mt-1">
              404
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-3xl font-heading font-bold tracking-tight">Página no encontrada</h2>
          <p className="text-muted-foreground">
            La dirección que buscas no existe o fue movida. Verifica la URL e intenta de nuevo.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button nativeButton={false} render={<Link href="/"><Home className="h-4 w-4 mr-2" />Ir al inicio</Link>} className="gap-2 bg-muni-blue hover:bg-muni-blue/90" />
          <Button variant="outline" nativeButton={false} render={<Link href="javascript:history.back()"><ArrowLeft className="h-4 w-4 mr-2" />Volver atrás</Link>} className="gap-2" />
        </div>
      </div>
    </div>
  )
}

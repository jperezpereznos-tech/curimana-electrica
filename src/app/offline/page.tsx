import { WifiOff } from 'lucide-react'
import Link from 'next/link'

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="mx-auto w-20 h-20 rounded-full bg-muted flex items-center justify-center animate-in zoom-in-95 duration-500 ease-out fill-mode-both">
          <WifiOff className="h-10 w-10 text-muted-foreground" />
        </div>
        <div className="space-y-2 animate-in fade-in slide-in-from-bottom-3 duration-500 ease-out fill-mode-both" style={{ animationDelay: '200ms' }}>
          <h1 className="text-2xl font-bold">Sin Conexión</h1>
          <p className="text-muted-foreground">
            No se pudo establecer conexión con el servidor. Verifica tu conexión a internet e intenta de nuevo.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out fill-mode-both"
          style={{ animationDelay: '400ms' }}
        >
          Reintentar
        </Link>
      </div>
    </div>
  )
}

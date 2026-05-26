'use client'

import { useAuth } from '@/hooks/use-auth'
import { useOfflineSync } from '@/hooks/use-offline-sync'
import { useBarcodeScanner } from '@/hooks/use-barcode-scanner'
import { Button } from '@/components/ui/button'
import { ModeToggle } from '@/components/mode-toggle'
import { Camera, ClipboardList, LogOut, RefreshCcw, ScanBarcode } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export function ReaderLayout({ children }: { children: React.ReactNode }) {
const { signOut, syncAndSignOut } = useAuth()
const pathname = usePathname()
const router = useRouter()
const { pendingSyncCount } = useOfflineSync()

useBarcodeScanner((barcode) => {
  router.push(`/reader/new?supply=${encodeURIComponent(barcode)}`)
  toast.info(`Código escaneado: ${barcode}`)
})

const navItems = [
  { name: 'Lectura', href: '/reader', icon: Camera },
  { name: 'Pendientes', href: '/reader/pending', icon: ClipboardList },
  { name: 'Sincronizar', href: '/reader/sync', icon: RefreshCcw },
]

return (
  <div className="min-h-screen bg-muted/40 flex flex-col pb-16">
    <header className="h-14 bg-muni-blue-deep text-white flex items-center justify-between px-4 sticky top-0 z-10 shadow-sm">
      <h1 className="font-heading font-bold text-muni-gold flex items-center gap-1.5">
        <ScanBarcode size={20} /> Lector Curimana
      </h1>
      <div className="flex items-center gap-1">
        <ModeToggle />
        <Button variant="ghost" size="icon" onClick={() => pendingSyncCount > 0 ? syncAndSignOut() : signOut()} className="text-white/70 hover:bg-muni-canopy/15 hover:text-white" aria-label="Cerrar sesión">
          <LogOut size={20} />
        </Button>
      </div>
    </header>

    <main id="main-content" className="flex-1 p-4">
      {children}
    </main>

    <nav className="h-16 bg-background border-t flex items-center justify-around fixed bottom-0 left-0 right-0 z-10 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "flex flex-col items-center space-y-1 transition-colors relative",
            pathname === item.href ? "text-muni-blue dark:text-muni-blue" : "text-muted-foreground"
          )}
        >
          <div className="relative">
            <item.icon size={24} />
            {item.href === '/reader/sync' && pendingSyncCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                {pendingSyncCount}
              </span>
            )}
          </div>
          <span className={cn(
            "text-[10px] font-medium uppercase tracking-wider",
            pathname === item.href && "text-muni-gold"
          )}>{item.name}</span>
          {pathname === item.href && (
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-muni-gold" />
          )}
        </Link>
      ))}
    </nav>
  </div>
)
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog'
import { Lock, Unlock, PlayCircle, Loader2 } from 'lucide-react'
import { cashClosureService } from '@/services/cash-closure-service'

export function ClosureActions({ action, closureId, userId }: { action: 'open' | 'close', closureId?: string, userId: string }) {
  const [open, setOpen] = useState(false)
  const [initialAmount, setInitialAmount] = useState('0')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleOpen = async () => {
    setLoading(true)
    try {
      await cashClosureService.openClosure(userId, Number(initialAmount))
      setOpen(false)
      router.refresh()
    } catch {
      alert('Error al abrir caja')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = async () => {
    if (!confirm('¿Estás seguro de cerrar la caja? No podrás registrar más pagos hasta abrir una nueva.')) {
      return
    }
    setLoading(true)
    try {
      await cashClosureService.closeClosure(closureId!)
      router.refresh()
    } catch {
      alert('Error al cerrar caja')
    } finally {
      setLoading(false)
    }
  }

  if (action === 'open') {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button size="lg" className="gap-2">
          <Unlock className="h-5 w-5" /> Iniciar Sesión de Caja
        </Button>
      } />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apertura de Caja</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="initial">Monto Inicial en Efectivo (S/)</Label>
              <Input 
                id="initial" 
                type="number" 
                className="text-2xl font-bold"
                value={initialAmount}
                onChange={(e) => setInitialAmount(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full h-12 gap-2" onClick={handleOpen} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-5 w-5" />}
              Abrir Caja
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Button variant="destructive" size="lg" className="gap-2" onClick={handleClose} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-5 w-5" />}
      Realizar Cierre de Caja
    </Button>
  )
}

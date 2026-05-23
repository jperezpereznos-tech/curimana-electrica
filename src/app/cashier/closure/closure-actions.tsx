'use client'

import { useState } from 'react'
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
import { openClosureAction, closeClosureAction } from '../actions'
import dynamic from 'next/dynamic'

const ConfirmDialog = dynamic(() => import('@/components/confirm-dialog').then(m => ({ default: m.ConfirmDialog })))

export function ClosureActions({ action, closureId }: { action: 'open' | 'close', closureId?: string }) {
  const [open, setOpen] = useState(false)
  const [initialAmount, setInitialAmount] = useState('0')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)

  const handleOpen = async () => {
    setError(null)
    const amount = Number(initialAmount)
    if (isNaN(amount) || amount < 0) {
      setError('El monto inicial debe ser un número válido mayor o igual a cero')
      return
    }

    setLoading(true)
    const result = await openClosureAction(amount)
    if (result.success) {
    setOpen(false)
    }
    setLoading(false)
  }

  const handleClose = async () => {
    if (!closureId) return
    setError(null)
    setLoading(true)
    const result = await closeClosureAction(closureId)
    if (result.success) {
    setShowCloseConfirm(false)
  } else {
      setError(result.error || 'Error al cerrar caja')
    }
    setLoading(false)
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
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
              {error}
            </div>
          )}
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
    <div className="space-y-2">
      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
          {error}
        </div>
      )}
      <Button variant="destructive" size="lg" className="gap-2" onClick={() => setShowCloseConfirm(true)} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-5 w-5" />}
    Realizar Cierre de Caja
    </Button>
    <ConfirmDialog
      open={showCloseConfirm}
      onOpenChange={setShowCloseConfirm}
      title="Cerrar Caja"
      description="¿Estás seguro de cerrar la caja? No podrás registrar más pagos hasta abrir una nueva."
      confirmLabel="Cerrar Caja"
      destructive
      onConfirm={handleClose}
    />
  </div>
  )
}

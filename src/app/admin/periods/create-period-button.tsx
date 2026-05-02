'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Plus, Loader2 } from 'lucide-react'
import { openNextPeriodAction } from './actions'

export function CreatePeriodButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleCreate = async () => {
    setError(null)
    setLoading(true)
    try {
      await openNextPeriodAction()
      router.refresh()
    } catch {
      setError('Error al crear el siguiente periodo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
          {error}
        </div>
      )}
      <Button onClick={handleCreate} disabled={loading} className="gap-2">
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Plus className="h-4 w-4" />
      )}
      Abrir Próximo Periodo
    </Button>
    </div>
  )
}

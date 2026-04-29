'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Plus, Loader2 } from 'lucide-react'
import { periodService } from '@/services/period-service'

export function CreatePeriodButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleCreate = async () => {
    setLoading(true)
    try {
      await periodService.createNextPeriod()
      router.refresh()
    } catch (error) {
      console.error('Error al crear periodo:', error)
      alert('Error al crear el siguiente periodo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleCreate} disabled={loading} className="gap-2">
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Plus className="h-4 w-4" />
      )}
      Abrir Próximo Periodo
    </Button>
  )
}

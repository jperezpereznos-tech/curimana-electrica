'use client'

import { ReaderLayout } from '@/components/layouts/reader-layout'
import { useAuth } from '@/hooks/use-auth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'

export default function ReaderLayoutWrapper({ children }: { children: React.ReactNode }) {
  const { user, role, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return
    if (!user || (role !== 'admin' && role !== 'meter_reader')) {
      router.replace('/')
    }
  }, [user, role, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user || (role !== 'admin' && role !== 'meter_reader')) {
    return null
  }

  return <ReaderLayout>{children}</ReaderLayout>
}

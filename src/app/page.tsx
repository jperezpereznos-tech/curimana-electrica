'use client'

import { useAuth } from '@/hooks/use-auth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function Home() {
  const { user, role, isLoading, profileError } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/login')
      } else if (role === 'admin') {
        router.push('/admin')
      } else if (role === 'cashier') {
        router.push('/cashier')
      } else if (role === 'meter_reader') {
        router.push('/reader')
      } else {
        // Si hay usuario pero no hay rol válido, algo está mal con el perfil
        console.error('Usuario sin rol válido detectado')
        router.push('/login')
      }
    }
  }, [user, role, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-muni-blue mb-4"></div>
        <p className="text-sm text-gray-500">Cargando sistema...</p>
        <div className="text-xs text-gray-400 mt-2 text-center">
          <p>User: {user ? 'Sí' : 'No'} | Role: {role || 'null'}</p>
          {profileError && (
            <p className="text-destructive mt-2 font-mono bg-destructive/10 p-2 rounded">
              Error: {profileError}
            </p>
          )}
        </div>
      </div>
    )
  }

  return null
}

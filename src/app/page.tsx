'use client'

import { useAuth } from '@/hooks/use-auth'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle, Loader2 } from 'lucide-react'

export default function Home() {
  const { user, role, isLoading, profileError, signOut } = useAuth()
  const router = useRouter()
  const [showError, setShowError] = useState(false)

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
        // Si hay usuario pero no hay rol válido
        console.error('Usuario sin rol válido detectado')
        setShowError(true)
      }
    }
  }, [user, role, isLoading, router])

  // Mostrar loading mientras se inicializa
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-muni-blue mb-4" />
        <p className="text-sm text-gray-500">Cargando sistema...</p>
        <div className="text-xs text-gray-400 mt-2 text-center">
          <p>User: {user ? 'Sí' : 'No'} | Role: {role || 'null'} | Loading: {isLoading ? 'Yes' : 'No'}</p>
          {profileError && <p className="text-red-500 mt-2">Error de perfil: {profileError}</p>}
        </div>
      </div>
    )
  }

  // Si hay error de perfil o no hay rol, mostrar pantalla de error
  if (showError || profileError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="max-w-md w-full bg-destructive/10 border border-destructive/20 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <h2 className="text-lg font-semibold text-destructive">Error de Acceso</h2>
          </div>
          
          <p className="text-sm text-gray-600 mb-4">
            Tu usuario no tiene un rol asignado en el sistema. Esto puede ocurrir porque:
          </p>
          
          <ul className="text-sm text-gray-600 mb-6 list-disc list-inside space-y-1">
            <li>Es tu primera vez iniciando sesión</li>
            <li>Tu perfil aún no ha sido configurado por un administrador</li>
            <li>Hubo un problema al crear tu perfil</li>
          </ul>

          <div className="bg-muted p-3 rounded mb-6 font-mono text-xs">
            <p>User ID: {user?.id || 'N/A'}</p>
            <p>Email: {user?.email || 'N/A'}</p>
            <p>Rol: {role || 'No asignado'}</p>
          </div>

          <div className="flex flex-col gap-2">
            <Button onClick={() => signOut()} variant="destructive" className="w-full">
              Cerrar Sesión
            </Button>
            <Button onClick={() => window.location.reload()} variant="outline" className="w-full">
              Reintentar
            </Button>
          </div>
        </div>
        
        <p className="text-xs text-gray-400 mt-6 text-center max-w-md">
          Si el problema persiste, contacta al administrador del sistema para que verifique tu perfil en la base de datos.
        </p>
      </div>
    )
  }

  return null
}

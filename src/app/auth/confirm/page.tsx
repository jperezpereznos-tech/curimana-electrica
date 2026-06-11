'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Zap } from 'lucide-react'

export default function AuthConfirmPage() {
  const [status, setStatus] = useState<'loading' | 'error'>('loading')
  const [message, setMessage] = useState('Verificando invitación...')

  useEffect(() => {
    const supabase = createClient()

    const hash = window.location.hash.substring(1)
    const params = new URLSearchParams(hash)

    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    const type = params.get('type')

    if (!accessToken || !refreshToken) {
      setStatus('error')
      setMessage('Enlace de invitación inválido o expirado. Solicita una nueva invitación al administrador.')
      return
    }

    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (error) {
          setStatus('error')
          setMessage('No se pudo verificar la invitación: ' + error.message)
          return
        }
        if (type === 'invite' || type === 'recovery') {
          window.location.replace('/auth/set-password')
        } else {
          window.location.replace('/')
        }
      })
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--muni-blue)' }}>
      <div className="flex flex-col items-center gap-6 p-10 rounded-2xl shadow-2xl" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', minWidth: 340 }}>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl" style={{ background: 'var(--muni-lightning)' }}>
            <Zap className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold text-white">Curimana Eléctrica</span>
        </div>

        {status === 'loading' && (
          <>
            <div className="h-10 w-10 rounded-full border-4 border-white/20 border-t-white animate-spin" />
            <p className="text-white/80 text-sm text-center">{message}</p>
          </>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center gap-3">
            <div className="h-12 w-12 rounded-full flex items-center justify-center text-2xl" style={{ background: 'rgba(239,68,68,0.2)' }}>
              ✕
            </div>
            <p className="text-red-300 text-sm text-center max-w-xs">{message}</p>
            <a
              href="/login"
              className="mt-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-80"
              style={{ background: 'var(--muni-forest)' }}
            >
              Ir al inicio de sesión
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

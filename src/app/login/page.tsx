'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import {
Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Zap, Leaf } from 'lucide-react'

const MAX_ATTEMPTS = 5
const WINDOW_MS = 60_000

const loginSchema = z.object({
  email: z.string().email({ message: 'Email inválido' }),
  password: z.string().min(6, { message: 'La contraseña debe tener al menos 6 caracteres' }),
})

export default function LoginPage() {
const [error, setError] = useState<string | null>(null)
const [isLoading, setIsLoading] = useState(false)
const [redirectUrl, setRedirectUrl] = useState<string | null>(null)
const [attemptCount, setAttemptCount] = useState(0)
const [windowStart, setWindowStart] = useState(0)
  const [supabase] = useState(() => createClient())

const form = useForm<z.infer<typeof loginSchema>>({
  resolver: zodResolver(loginSchema),
  defaultValues: {
    email: '',
    password: '',
  },
})

useEffect(() => {
  if (redirectUrl) window.location.replace(redirectUrl)
}, [redirectUrl])

async function onSubmit(values: z.infer<typeof loginSchema>) {
  setIsLoading(true)
  setError(null)

  const now = new Date().getTime()
  let currentCount = attemptCount
  let currentStart = windowStart

  if (now - currentStart > WINDOW_MS) {
    currentCount = 0
    currentStart = now
    setWindowStart(now)
  }

  if (currentCount >= MAX_ATTEMPTS) {
    const retryAfter = Math.ceil((WINDOW_MS - (now - currentStart)) / 1000)
    setError(`Demasiados intentos. Espere ${retryAfter} segundos antes de intentar de nuevo.`)
    setIsLoading(false)
    return
  }

  setAttemptCount(currentCount + 1)

  try {
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    })

    if (authError) {
      setError('Credenciales inválidas')
      setIsLoading(false)
      return
    }

    setRedirectUrl('/')
  } catch {
    setError('Error de conexión. Intente de nuevo.')
    setIsLoading(false)
  }
}

return (
  <div className="relative flex min-h-screen">
    <div className="hidden lg:flex lg:w-1/2 bg-muni-blue-deep relative overflow-hidden flex-col items-center justify-center p-12 text-white animate-in fade-in slide-in-from-left-8 duration-700 ease-out fill-mode-both">
      <div className="absolute inset-0 opacity-[0.06]" style={{
        backgroundImage: `
          radial-gradient(ellipse 80px 120px at 20% 30%, currentColor 0.5px, transparent 0.5px),
          radial-gradient(ellipse 60px 100px at 60% 15%, currentColor 0.5px, transparent 0.5px),
          radial-gradient(ellipse 100px 80px at 80% 55%, currentColor 0.5px, transparent 0.5px),
          radial-gradient(ellipse 70px 110px at 35% 70%, currentColor 0.5px, transparent 0.5px),
          radial-gradient(ellipse 90px 90px at 75% 85%, currentColor 0.5px, transparent 0.5px),
          radial-gradient(ellipse 50px 80px at 15% 90%, currentColor 0.5px, transparent 0.5px)
        `,
        backgroundSize: '200px 200px, 160px 160px, 250px 250px, 180px 180px, 220px 220px, 140px 140px',
      }} />
      <div className="absolute inset-0 bg-gradient-to-br from-muni-canopy/20 via-transparent to-muni-blue/30" />

      <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-muni-canopy/10 animate-in zoom-in-95 duration-1000 ease-out fill-mode-both" style={{ animationDelay: '400ms' }} />
      <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-muni-lightning/5 animate-in zoom-in-95 duration-1000 ease-out fill-mode-both" style={{ animationDelay: '600ms' }} />

      <div className="relative z-10 flex flex-col items-center text-center space-y-8 max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out fill-mode-both" style={{ animationDelay: '200ms' }}>
        <div className="relative">
          <div className="h-24 w-24 rounded-2xl bg-muni-lightning/15 backdrop-blur-sm flex items-center justify-center border border-muni-lightning/25 shadow-lg shadow-muni-lightning/10">
            <Zap size={44} className="text-muni-lightning" strokeWidth={1.5} />
          </div>
          <div className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-muni-canopy/30 flex items-center justify-center border border-muni-canopy/30">
            <Leaf size={14} className="text-muni-canopy" strokeWidth={2} />
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-4xl font-heading font-bold leading-tight">Municipalidad Distrital de Curimana</h1>
          <p className="text-lg text-white/60 font-light leading-relaxed">
            Sistema de Recaudación de Energía Eléctrica
          </p>
        </div>

        <div className="flex items-center gap-3 text-sm text-white/35 pt-6">
          <Leaf size={10} className="text-muni-canopy/50" strokeWidth={2} />
          <div className="h-px w-12 bg-white/15" />
          <span>Ucayali, Perú</span>
          <div className="h-px w-12 bg-white/15" />
          <Leaf size={10} className="text-muni-canopy/50" strokeWidth={2} style={{ transform: 'scaleX(-1)' }} />
        </div>
      </div>
    </div>

    <div className="flex flex-1 items-center justify-center px-6 py-12 bg-background animate-in fade-in slide-in-from-right-6 duration-500 ease-out fill-mode-both" style={{ animationDelay: '150ms' }}>
      <div className="w-full max-w-sm space-y-8">
        <div className="lg:hidden flex flex-col items-center text-center space-y-3 mb-8">
          <div className="h-16 w-16 rounded-xl bg-muni-blue dark:bg-muni-blue-deep flex items-center justify-center shadow-md">
            <Zap size={32} className="text-muni-lightning" strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-heading font-bold text-muni-blue dark:text-muni-blue">Curimana Eléctrica</h1>
        </div>

        <div className="space-y-1.5">
          <h2 className="text-2xl font-heading font-bold tracking-tight">Iniciar Sesión</h2>
          <p className="text-sm text-muted-foreground">Ingresa tus credenciales para acceder al sistema</p>
        </div>

        <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
            <FormLabel>Email institucional</FormLabel>
            <FormControl>
              <Input placeholder="admin@curimana.gob.pe" {...field} />
            </FormControl>
            <FormMessage />
            </FormItem>
          )}
          />
          <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
            <FormLabel>Contraseña</FormLabel>
            <FormControl>
              <Input type="password" {...field} />
            </FormControl>
            <FormMessage />
            </FormItem>
          )}
          />
          {error && (
            <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button type="submit" className="w-full bg-muni-blue hover:bg-muni-blue-deep dark:bg-muni-blue dark:hover:bg-muni-blue/80" disabled={isLoading}>
            {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </Button>
        </form>
        </Form>

        <p className="text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Municipalidad Distrital de Curimana
        </p>
      </div>
    </div>
  </div>
)
}

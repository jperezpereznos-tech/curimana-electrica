'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import {
Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useRouter } from 'next/navigation'

const loginSchema = z.object({
  email: z.string().email({ message: 'Email inválido' }),
  password: z.string().min(6, { message: 'La contraseña debe tener al menos 6 caracteres' }),
})

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setIsLoading(true)
    setError(null)

  try {
    const rateRes = await fetch('/api/auth/login', { method: 'POST' })

    if (!rateRes.ok) {
      setError('Servicio no disponible. Intente de nuevo.')
      setIsLoading(false)
      return
    }

    const rateData = await rateRes.json()

    if (!rateData.allowed) {
      setError(`Demasiados intentos. Espere ${rateData.retryAfter} segundos antes de intentar de nuevo.`)
      setIsLoading(false)
      return
    }

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    })

    if (authError) {
      setError('Credenciales inválidas')
      setIsLoading(false)
      return
    }

    router.replace('/')
    router.refresh()
  } catch {
    setError('Error de conexión. Intente de nuevo.')
    setIsLoading(false)
  }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold text-muni-blue">Curimana Eléctrica</CardTitle>
          <CardDescription>
            Ingresa tus credenciales para acceder al sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
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
              <Button type="submit" className="w-full bg-muni-blue hover:bg-muni-blue/90" disabled={isLoading}>
                {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="text-center text-sm text-muted-foreground flex justify-center">
          © {new Date().getFullYear()} Municipalidad Distrital de Curimana
        </CardFooter>
      </Card>
    </div>
  )
}

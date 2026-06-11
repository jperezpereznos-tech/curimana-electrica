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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Zap, Eye, EyeOff, CheckCircle } from 'lucide-react'

const schema = z
  .object({
    password: z.string().min(8, { message: 'La contraseña debe tener al menos 8 caracteres' }),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'Las contraseñas no coinciden',
    path: ['confirm'],
  })

export default function SetPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirm: '' },
  })

  async function onSubmit(values: z.infer<typeof schema>) {
    setIsLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({
      password: values.password,
    })

    setIsLoading(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    setSuccess(true)
    setTimeout(() => {
      window.location.replace('/')
    }, 2000)
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--muni-blue)' }}>
      <div
        className="flex flex-col gap-6 p-10 rounded-2xl shadow-2xl w-full max-w-md"
        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
      >
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl" style={{ background: 'var(--muni-lightning)' }}>
            <Zap className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold text-white">Curimana Eléctrica</span>
        </div>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <CheckCircle className="h-12 w-12 text-green-400" />
            <p className="text-white font-semibold text-lg">¡Contraseña establecida!</p>
            <p className="text-white/60 text-sm text-center">Redirigiendo al sistema...</p>
          </div>
        ) : (
          <>
            <div>
              <h1 className="text-2xl font-bold text-white">Establece tu contraseña</h1>
              <p className="text-white/60 text-sm mt-1">
                Has sido invitado al sistema. Crea una contraseña segura para acceder.
              </p>
            </div>

            {error && (
              <Alert className="border-red-500/30 bg-red-500/10">
                <AlertDescription className="text-red-300 text-sm">{error}</AlertDescription>
              </Alert>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80 text-sm">Nueva contraseña</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            id="set-password-new"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Mínimo 8 caracteres"
                            className="pr-10"
                            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors"
                            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage className="text-red-300 text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80 text-sm">Confirmar contraseña</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            id="set-password-confirm"
                            type={showConfirm ? 'text' : 'password'}
                            placeholder="Repite la contraseña"
                            className="pr-10"
                            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirm((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors"
                            aria-label={showConfirm ? 'Ocultar confirmación' : 'Mostrar confirmación'}
                          >
                            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage className="text-red-300 text-xs" />
                    </FormItem>
                  )}
                />

                <Button
                  id="set-password-submit"
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 font-semibold"
                  style={{ background: 'var(--muni-forest)', color: 'white' }}
                >
                  {isLoading ? 'Guardando...' : 'Establecer contraseña'}
                </Button>
              </form>
            </Form>
          </>
        )}
      </div>
    </div>
  )
}

import { createClient } from '@/lib/supabase/server'
import { ConfigForm } from './config-form'

export default async function ConfigPage() {
  const supabase = await createClient()
  const { data: config, error } = await supabase
    .from('municipality_config')
    .select('*')
    .limit(1)
    .single()

  return (
    <>
      <div className="mb-6">
        <h2 className="text-3xl font-bold tracking-tight">Configuracion Municipal</h2>
        <p className="text-muted-foreground">Datos de la municipalidad y parametros de facturacion.</p>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-4 rounded-lg mb-4">
          Error al cargar configuracion: {error.message}
        </div>
      )}

      <ConfigForm config={config} />
    </>
  )
}

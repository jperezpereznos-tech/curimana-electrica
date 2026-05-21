import { createClient } from '@/lib/supabase/server'
import { getMunicipalityConfigService } from '@/services/municipality-config-service'
import { ConfigForm } from './config-form'

export default async function ConfigPage() {
  const supabase = await createClient()
  const configService = getMunicipalityConfigService(supabase)
  let config = null
  let errorMsg: string | null = null

  try {
    config = await configService.getConfig()
  } catch (e) {
    errorMsg = e instanceof Error ? e.message : 'Error al cargar configuración'
  }

  return (
    <>
      <div className="mb-6">
        <h2 className="text-3xl font-bold tracking-tight">Configuracion Municipal</h2>
        <p className="text-muted-foreground">Datos de la municipalidad y parametros de facturacion.</p>
      </div>

    {errorMsg && (
      <div className="bg-destructive/10 text-destructive text-sm p-4 rounded-lg mb-4">
        Error al cargar configuracion: {errorMsg}
      </div>
    )}

      <ConfigForm config={config} />
    </>
  )
}

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { period_id } = await req.json()

    if (!period_id) throw new Error('period_id is required')

    // 1. Obtener periodo y configuración municipal
    const { data: period } = await supabaseClient
      .from('billing_periods')
      .select('*')
      .eq('id', period_id)
      .single()

    // 2. Obtener clientes activos con sus lecturas del periodo
    const { data: customers } = await supabaseClient
      .from('customers')
      .select(`
        *,
        tariffs (*, tariff_tiers (*)),
        readings (*)
      `)
      .eq('is_active', true)

    const results = []

    // 3. Generar recibo para cada cliente
    for (const customer of customers) {
      const reading = customer.readings?.find((r: any) => r.billing_period_id === period_id)
      
      // Si no hay lectura, se puede estimar o dejar en 0 consumo
      const consumption = reading ? reading.consumption : 0
      
      // Lógica de cálculo (simplificada para el ejemplo)
      // En producción llamaría a la función SQL calculate_energy_amount o replicaría aquí
      const energy_amount = 0 // TODO: Implementar cálculo exacto

      const receipt = {
        receipt_number: Date.now(), // TODO: Secuencial real
        customer_id: customer.id,
        reading_id: reading?.id || null,
        billing_period_id: period_id,
        previous_reading: reading?.previous_reading || 0,
        current_reading: reading?.current_reading || 0,
        consumption_kwh: consumption,
        energy_amount,
        fixed_charges: 9.20, // Suma de fijos del seed
        subtotal: energy_amount + 9.20,
        previous_debt: customer.current_debt,
        total_amount: energy_amount + 9.20 + customer.current_debt,
        due_date: new Date(new Date(period.end_date).getTime() + 20 * 24 * 60 * 60 * 1000).toISOString(),
        period_start: period.start_date,
        period_end: period.end_date,
        status: 'pending'
      }

      const { data: newReceipt } = await supabaseClient
        .from('receipts')
        .insert(receipt)
        .select()
        .single()

      results.push(newReceipt)
    }

    return new Response(
      JSON.stringify({ message: `Se generaron ${results.length} recibos.`, count: results.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})

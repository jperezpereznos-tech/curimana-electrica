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

    const { data: period } = await supabaseClient
      .from('billing_periods')
      .select('*')
      .eq('id', period_id)
      .single()

    if (!period) throw new Error('Periodo no encontrado')

    const { data: config } = await supabaseClient
      .from('municipality_config')
      .select('payment_grace_days')
      .limit(1)
      .single()

    const graceDays = config?.payment_grace_days || 20

    const { data: activeConcepts } = await supabaseClient
      .from('billing_concepts')
      .select('*')
      .eq('is_active', true)

    const { data: customers } = await supabaseClient
      .from('customers')
      .select(`
        *,
        tariffs (*, tariff_tiers (*)),
        readings (*)
      `)
      .eq('is_active', true)

    const concepts = activeConcepts || []
    const results: any[] = []
    const errors: string[] = []

    for (const customer of customers || []) {
      try {
        const reading = customer.readings?.find((r: any) => r.billing_period_id === period_id)
        if (!reading) continue

        const consumption = reading.consumption || 0
        const tariff = customer.tariffs
        const tiers = (tariff?.tariff_tiers || []).sort((a: any, b: any) => a.min_kwh - b.min_kwh)

        let fixedCharges = 0
        let percentageBase = 0

        for (const concept of concepts) {
          if (concept.applies_to_tariff_id && concept.applies_to_tariff_id !== customer.tariff_id) continue

          if (concept.type === 'fixed') fixedCharges += concept.amount
          if (concept.type === 'per_kwh') fixedCharges += consumption * concept.amount
        }

        const { data: energyResult } = await supabaseClient
          .rpc('calculate_energy_amount', { p_consumption: consumption, p_tariff_id: customer.tariff_id })

        const energy_amount = energyResult || 0
        percentageBase = energy_amount + fixedCharges

        for (const concept of concepts) {
          if (concept.applies_to_tariff_id && concept.applies_to_tariff_id !== customer.tariff_id) continue

          if (concept.type === 'percentage') {
            fixedCharges += (percentageBase * concept.amount) / 100
          }
        }

        fixedCharges = Math.round(fixedCharges * 100) / 100
        const previousDebt = customer.current_debt || 0

        const subtotal = Math.round((energy_amount + fixedCharges) * 100) / 100
        const igv = Math.round(subtotal * 0.18 * 100) / 100
        const total_amount = Math.round((subtotal + igv + previousDebt) * 100) / 100

        const dueDate = new Date(period.end_date)
        dueDate.setDate(dueDate.getDate() + graceDays)

        const receipt = {
          customer_id: customer.id,
          reading_id: reading.id,
          billing_period_id: period_id,
          previous_reading: reading.previous_reading || 0,
          current_reading: reading.current_reading || 0,
          consumption_kwh: consumption,
          energy_amount,
          fixed_charges: fixedCharges,
          subtotal,
          igv,
          previous_debt: previousDebt,
          total_amount,
          paid_amount: 0,
          status: 'pending',
          issue_date: new Date().toISOString().split('T')[0],
          due_date: dueDate.toISOString().split('T')[0],
          period_start: period.start_date,
          period_end: period.end_date,
        }

        const { data: newReceipt, error: insertError } = await supabaseClient
          .from('receipts')
          .insert(receipt)
          .select()
          .single()

        if (insertError) throw insertError
        results.push(newReceipt)
      } catch (err: any) {
        errors.push(`Cliente ${customer.id}: ${err.message}`)
      }
    }

    return new Response(
      JSON.stringify({
        message: `Se generaron ${results.length} recibos.`,
        count: results.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})

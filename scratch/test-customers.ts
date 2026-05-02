import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY // Wait, do we have it? Let's check .env.local

if (!supabaseUrl) {
  console.error('Missing env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

async function test() {
  const { data, error } = await supabase
    .from('customers')
    .select('*, tariffs(name, tariff_tiers(*)), readings(current_reading, reading_date)')
    .order('full_name', { ascending: true })
    .limit(50)

  if (error) {
    console.error('ERROR:', error)
  } else {
    console.log('SUCCESS, fetched', data?.length, 'rows')
  }
}

test()

import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yxhzkbzmnvhesdefwgjc.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const users = [
  { email: process.env.ADMIN_EMAIL || 'admin@curimana.gob.pe', password: process.env.ADMIN_PASSWORD || crypto.randomUUID(), role: 'admin' },
  { email: process.env.CASHIER_EMAIL || 'cajero@curimana.gob.pe', password: process.env.CASHIER_PASSWORD || crypto.randomUUID(), role: 'cashier' },
  { email: process.env.READER_EMAIL || 'lector@curimana.gob.pe', password: process.env.READER_PASSWORD || crypto.randomUUID(), role: 'meter_reader' }
];

async function main() {
  for (const user of users) {
    const { error } = await supabase.auth.signUp({
      email: user.email,
      password: user.password,
      options: {
        data: {
          full_name: `Test ${user.role}`
        }
      }
    });

    if (error) {
      console.log(`Failed to create ${user.email}:`, error.message);
    } else {
      console.log(`Created ${user.email} — password: ${user.password}`);
    }
  }
}

main();

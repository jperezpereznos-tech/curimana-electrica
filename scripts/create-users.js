import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yxhzkbzmnvhesdefwgjc.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const users = [
  { email: 'admin@curimana.gob.pe', password: 'password', role: 'admin' },
  { email: 'cajero@curimana.gob.pe', password: 'password', role: 'cashier' },
  { email: 'lector@curimana.gob.pe', password: 'password', role: 'meter_reader' }
];

async function main() {
  for (const user of users) {
    const { data, error } = await supabase.auth.signUp({
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
      console.log(`Created ${user.email}`);
    }
  }
}

main();

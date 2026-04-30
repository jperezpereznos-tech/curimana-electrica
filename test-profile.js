import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function test() {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@curimana.gob.pe',
    password: 'admin123'
  });
  
  if (authError) {
    console.log("Auth Error:", authError);
    return;
  }
  
  console.log("Logged in as:", authData.user.id);
  
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', authData.user.id)
    .single();
    
  console.log("Profile Error:", error);
  console.log("Profile Data:", data);
}

test();

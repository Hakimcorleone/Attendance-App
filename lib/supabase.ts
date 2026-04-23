import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;

export function getBrowserSupabaseClient() {
  return createClient(supabaseUrl, supabasePublishableKey);
}

export function getServerSupabaseClient() {
  return createClient(supabaseUrl, supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

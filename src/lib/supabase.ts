import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

export const isSupabaseConfigured =
  typeof supabaseUrl === 'string' &&
  typeof supabaseKey === 'string' &&
  supabaseUrl.length > 0 &&
  supabaseKey.length > 0 &&
  !supabaseUrl.includes('your-project') &&
  !supabaseKey.includes('your-key');

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

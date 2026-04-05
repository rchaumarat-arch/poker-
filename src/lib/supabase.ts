import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase non configuré. Renseigne VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans .env.local'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

import { createClient } from '@supabase/supabase-js';

// Expect Vite env vars. In production, these must be set.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Configure these env vars to run the app.');
}

// Optional debug: show which Supabase URL the client uses
try {
  // Only log during dev/prod runtime, skip in test
  if (import.meta.env.MODE !== 'test') {
    // eslint-disable-next-line no-console
    console.log(`🔗 Using Supabase URL (client): ${supabaseUrl}`);
  }
} catch {}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

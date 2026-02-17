import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy initialization to support serverless environments
let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables');
    }

    _supabase = createClient(supabaseUrl, supabaseKey);
    console.log('Supabase client initialized:', supabaseUrl);
  }
  return _supabase;
}

// For backwards compatibility - exports a getter that lazily initializes
export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    return (getSupabase() as unknown as Record<string | symbol, unknown>)[prop];
  }
});

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

// Built lazily rather than at module load. In demo mode the Supabase
// implementation is still imported — it is a static import, and bundlers do not
// remove it — but nothing calls into it, so a machine with no Supabase
// configuration must not be greeted by a thrown error on page load.
let client: SupabaseClient<Database> | null = null

export function getSupabase(): SupabaseClient<Database> {
  if (client !== null) {
    return client
  }

  // Both values are baked into the bundle at build time — that is what the
  // VITE_ prefix means. The publishable key is designed for it; row level
  // security, not secrecy, is what protects the data behind it.
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env.local and fill both in, or set VITE_DEMO_MODE=true to run on demo data.',
    )
  }

  client = createClient<Database>(supabaseUrl, supabaseKey)
  return client
}

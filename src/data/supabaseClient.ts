import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

// Both values are baked into the bundle at build time — that is what the VITE_
// prefix means. The publishable key is designed for it; row level security, not
// secrecy, is what protects the data behind it.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env.local and fill both in.',
  )
}

export const supabase = createClient<Database>(supabaseUrl, supabaseKey)

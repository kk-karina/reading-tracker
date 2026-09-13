import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { resolveConfig } from './supabaseConfig'

let client: SupabaseClient | null = null
let error: string | null = null

try {
  const config = resolveConfig(
    import.meta.env.VITE_SUPABASE_URL as string | undefined,
    import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined,
  )
  if (config) client = createClient(config.url, config.key)
} catch (e) {
  // A misconfigured backend must not take the whole app down with it: fall back
  // to local mode and say out loud what is wrong.
  error = e instanceof Error ? e.message : String(e)
  console.error(error)
}

export const supabase = client
export const configError = error
export const isSupabase = client !== null

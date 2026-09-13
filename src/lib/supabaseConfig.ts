export interface SupabaseConfig {
  url: string
  key: string
}

/**
 * Reads the two environment values.
 *
 * Both empty means local mode, which is a normal way to run. But a value that is
 * present and wrong is a mistake, and it used to reach `createClient`, which
 * throws while the module is still loading — the whole app became a white page
 * with the reason buried in the console. Here it fails with a sentence that says
 * which variable is wrong and what it should look like.
 */
export function resolveConfig(
  rawUrl: string | undefined,
  rawKey: string | undefined,
): SupabaseConfig | null {
  const url = rawUrl?.trim() ?? ''
  const key = rawKey?.trim() ?? ''
  if (!url || !key) return null

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error(
      `VITE_SUPABASE_URL is not a URL: "${url}". It should look like https://yourproject.supabase.co — copy Project URL from Supabase → Project Settings → API.`,
    )
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error(
      `VITE_SUPABASE_URL must start with https:// — got "${url}". Copy Project URL from Supabase → Project Settings → API.`,
    )
  }
  return { url, key }
}

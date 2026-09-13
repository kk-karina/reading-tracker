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

  // This message can end up on a public page. Show just enough of the value to
  // recognise the mistake — never enough to hand over a key pasted by accident.
  const hint = url.length > 12 ? `${url.slice(0, 12)}…` : url

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error(
      `VITE_SUPABASE_URL is not a URL: "${hint}". It should look like https://yourproject.supabase.co — copy Project URL from Supabase → Project Settings → API.`,
    )
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error(
      `VITE_SUPABASE_URL must start with https:// — got "${hint}". Copy Project URL from Supabase → Project Settings → API.`,
    )
  }
  // Only the origin. The dashboard shows a "Data API URL" ending in /rest/v1/,
  // which is the easiest value to copy and the wrong one to paste: the client
  // appends its own paths, so every call would land on /rest/v1/auth/v1/... and
  // come back as "Invalid path specified in request URL".
  if (parsed.origin !== url) {
    console.warn(
      `VITE_SUPABASE_URL had a path on it; using ${parsed.origin}. The project URL has no path.`,
    )
  }
  return { url: parsed.origin, key }
}

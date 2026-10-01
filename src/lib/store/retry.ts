/**
 * PostgREST refuses a token whose `iat` sits ahead of its own clock and answers
 * PGRST303, "JWT issued at future". Both clocks in that comparison are
 * Supabase's own — the auth service stamps the token, the API reads it — so no
 * change on this side prevents it, and refreshing the session makes it worse: a
 * newer token carries a newer `iat`. The cure is to wait and send the same
 * token again, which is what these delays are for.
 *
 * Only the auth codes count as transient. They are decided before the query
 * runs, so nothing reached the database and even an insert is safe to repeat; a
 * dropped connection carries no such promise and is left alone.
 *
 * This lives apart from either store because the reason is Supabase's clock,
 * not a section of the app: reading and learning retry for the same cause and
 * must not drift into two answers to it.
 */
const TRANSIENT_CODES = new Set(['PGRST301', 'PGRST303'])
const BACKOFF_MS = [400, 1200, 3000]

export interface Failure {
  code?: string
  message: string
}
export interface Result<T> {
  data: T
  error: Failure | null
}

export function isTransient(error: Failure | null): boolean {
  if (!error) return false
  if (error.code && TRANSIENT_CODES.has(error.code)) return true
  return error.message.includes('JWT issued at future')
}

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms))

/** Runs the query, and runs it again — same token, later — while it fails transiently. */
export async function retrying<T>(query: () => PromiseLike<Result<T>>): Promise<Result<T>> {
  let result = await query()
  for (const wait of BACKOFF_MS) {
    if (!isTransient(result.error)) return result
    await sleep(wait)
    result = await query()
  }
  return result
}

export function throwIf(error: Failure | null): void {
  if (error) throw new Error(error.message)
}

/** Awaits a query with the retry above, then throws if it still failed. */
export async function ok<T>(query: () => PromiseLike<Result<T>>): Promise<T> {
  const { data, error } = await retrying(query)
  throwIf(error)
  return data
}

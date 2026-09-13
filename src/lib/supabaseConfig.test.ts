import { describe, expect, test } from 'vitest'
import { resolveConfig } from './supabaseConfig'

const KEY = 'sb_publishable_abc123'

describe('resolveConfig', () => {
  test('accepts a project URL and a key', () => {
    expect(resolveConfig('https://abcdefgh.supabase.co', KEY)).toEqual({
      url: 'https://abcdefgh.supabase.co',
      key: KEY,
    })
  })

  test('is absent when either value is missing, which means local mode', () => {
    expect(resolveConfig(undefined, KEY)).toBeNull()
    expect(resolveConfig('https://abcdefgh.supabase.co', undefined)).toBeNull()
    expect(resolveConfig('', '')).toBeNull()
  })

  test('trims whitespace a copy-paste leaves behind', () => {
    expect(resolveConfig('  https://abcdefgh.supabase.co \n', ` ${KEY} `)).toEqual({
      url: 'https://abcdefgh.supabase.co',
      key: KEY,
    })
  })

  test('rejects a bare project reference instead of crashing on it', () => {
    expect(() => resolveConfig('abcdefgh', KEY)).toThrow(/VITE_SUPABASE_URL/)
  })

  test('rejects the key pasted into the URL by mistake', () => {
    expect(() => resolveConfig(KEY, 'https://abcdefgh.supabase.co')).toThrow(/VITE_SUPABASE_URL/)
  })

  test('rejects a URL with no scheme', () => {
    expect(() => resolveConfig('abcdefgh.supabase.co', KEY)).toThrow(/VITE_SUPABASE_URL/)
  })

  test('names what it expected, so the message is actionable', () => {
    expect(() => resolveConfig('abcdefgh', KEY)).toThrow(/https:\/\//)
  })

  test('shows only the start of the bad value, never the whole secret', () => {
    // This message is rendered on a page that may be public. A secret key pasted
    // into the wrong box must not be published along with the complaint.
    const secret = 'sb_secret_pleaseDoNotPublishThisAnywhereEver'
    let message = ''
    try {
      resolveConfig(secret, KEY)
    } catch (e) {
      message = (e as Error).message
    }
    expect(message).not.toContain('pleaseDoNotPublishThisAnywhereEver')
    expect(message).toContain('sb_secret_pl…')
  })
})

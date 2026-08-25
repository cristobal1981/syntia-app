import { describe, expect, it, afterEach } from 'vitest'

import { getSiteUrl, isSupabaseConfigured } from '@/src/modules/auth/infrastructure/supabase/env'

const ENV_KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SITE_URL',
  'SITE_URL',
] as const

const originalEnv: Record<string, string | undefined> = {}
for (const key of ENV_KEYS) {
  originalEnv[key] = process.env[key]
}

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (originalEnv[key] === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = originalEnv[key]
    }
  }
})

describe('isSupabaseConfigured', () => {
  it('requires BOTH the URL and the anon key — one alone is not enough', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    expect(isSupabaseConfigured()).toBe(false)

    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
    expect(isSupabaseConfigured()).toBe(false)
  })

  it('is true only when both are set', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
    expect(isSupabaseConfigured()).toBe(true)
  })

  it('treats an empty string as not configured', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = ''
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
    expect(isSupabaseConfigured()).toBe(false)
  })
})

describe('getSiteUrl', () => {
  it('prefers NEXT_PUBLIC_SITE_URL over SITE_URL', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://public.example.com'
    process.env.SITE_URL = 'https://server-only.example.com'
    expect(getSiteUrl()).toBe('https://public.example.com')
  })

  it('falls back to SITE_URL when the public one is unset', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL
    process.env.SITE_URL = 'https://server-only.example.com'
    expect(getSiteUrl()).toBe('https://server-only.example.com')
  })

  it('falls back to localhost when neither is set', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL
    delete process.env.SITE_URL
    expect(getSiteUrl()).toBe('http://localhost:3000')
  })
})

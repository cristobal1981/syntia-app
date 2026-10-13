import { describe, expect, it, vi, beforeEach } from 'vitest'

import {
  createSupabaseBrowserClient,
  isSupabaseBrowserConfigured,
} from '@/src/modules/auth/infrastructure/supabase/client'

const { createBrowserClient } = vi.hoisted(() => ({
  createBrowserClient: vi.fn(() => ({ fake: 'client' })),
}))

vi.mock('@supabase/ssr', () => ({ createBrowserClient }))

beforeEach(() => {
  vi.clearAllMocks()
  delete process.env.NEXT_PUBLIC_SUPABASE_URL
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
})

describe('createSupabaseBrowserClient', () => {
  it('throws instead of returning a half-configured client when env vars are missing', () => {
    expect(() => createSupabaseBrowserClient()).toThrow('Supabase no configurado')
    expect(createBrowserClient).not.toHaveBeenCalled()
  })

  it('passes the configured URL and anon key through to the underlying factory', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'

    createSupabaseBrowserClient()

    expect(createBrowserClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'anon-key'
    )
  })
})

describe('isSupabaseBrowserConfigured', () => {
  it('mirrors isSupabaseConfigured()', () => {
    expect(isSupabaseBrowserConfigured()).toBe(false)
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
    expect(isSupabaseBrowserConfigured()).toBe(true)
  })
})

import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'

import {
  parseRecoveryOtpType,
  verifyRecoveryLink,
} from '@/src/modules/auth/application/verify-recovery-link'

function fakeSupabase(overrides: Record<string, unknown> = {}) {
  return {
    auth: {
      verifyOtp: vi.fn().mockResolvedValue({ error: null }),
      exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
      setSession: vi.fn().mockResolvedValue({ error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      ...overrides,
    },
  } as unknown as SupabaseClient
}

describe('parseRecoveryOtpType', () => {
  it('accepts the known Supabase OTP types', () => {
    expect(parseRecoveryOtpType('recovery')).toBe('recovery')
    expect(parseRecoveryOtpType('invite')).toBe('invite')
    expect(parseRecoveryOtpType('magiclink')).toBe('magiclink')
  })

  it('rejects an arbitrary/unknown value instead of passing it through', () => {
    expect(parseRecoveryOtpType('admin_override')).toBeNull()
  })

  it('rejects null/empty input', () => {
    expect(parseRecoveryOtpType(null)).toBeNull()
    expect(parseRecoveryOtpType('')).toBeNull()
  })
})

describe('verifyRecoveryLink', () => {
  it('uses verifyOtp when both tokenHash and otpType are present', async () => {
    const verifyOtp = vi.fn().mockResolvedValue({ error: null })
    const supabase = fakeSupabase({ verifyOtp })

    const result = await verifyRecoveryLink(supabase, {
      tokenHash: 'hash-1',
      otpType: 'recovery',
      code: null,
    })

    expect(result).toEqual({ ok: true })
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: 'hash-1', type: 'recovery' })
  })

  it('reports failure when verifyOtp returns an error', async () => {
    const supabase = fakeSupabase({
      verifyOtp: vi.fn().mockResolvedValue({ error: { message: 'expired' } }),
    })

    const result = await verifyRecoveryLink(supabase, {
      tokenHash: 'hash-1',
      otpType: 'recovery',
      code: null,
    })

    expect(result).toEqual({ ok: false })
  })

  it('PRIORITY: tokenHash+otpType wins over `code` when both are present', async () => {
    const verifyOtp = vi.fn().mockResolvedValue({ error: null })
    const exchangeCodeForSession = vi.fn().mockResolvedValue({ error: null })
    const supabase = fakeSupabase({ verifyOtp, exchangeCodeForSession })

    await verifyRecoveryLink(supabase, {
      tokenHash: 'hash-1',
      otpType: 'recovery',
      code: 'some-code',
    })

    expect(verifyOtp).toHaveBeenCalled()
    expect(exchangeCodeForSession).not.toHaveBeenCalled()
  })

  it('falls back to the PKCE code exchange when there is no tokenHash/otpType', async () => {
    const exchangeCodeForSession = vi.fn().mockResolvedValue({ error: null })
    const supabase = fakeSupabase({ exchangeCodeForSession })

    const result = await verifyRecoveryLink(supabase, {
      tokenHash: null,
      otpType: null,
      code: 'pkce-code',
    })

    expect(result).toEqual({ ok: true })
    expect(exchangeCodeForSession).toHaveBeenCalledWith('pkce-code')
  })

  it('falls back to setSession with the hash-fragment tokens as a last resort before/over the plain getSession check', async () => {
    const setSession = vi.fn().mockResolvedValue({ error: null })
    const supabase = fakeSupabase({ setSession })

    const result = await verifyRecoveryLink(supabase, {
      tokenHash: null,
      otpType: null,
      code: null,
      accessToken: 'at',
      refreshToken: 'rt',
    })

    expect(result).toEqual({ ok: true })
    expect(setSession).toHaveBeenCalledWith({ access_token: 'at', refresh_token: 'rt' })
  })

  it('with no recovery params at all, only succeeds if a session ALREADY exists', async () => {
    const supabase = fakeSupabase({
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'x' } } }),
    })

    const result = await verifyRecoveryLink(supabase, {
      tokenHash: null,
      otpType: null,
      code: null,
    })

    expect(result).toEqual({ ok: true })
  })

  it('with no recovery params and no existing session, fails closed', async () => {
    const supabase = fakeSupabase()

    const result = await verifyRecoveryLink(supabase, {
      tokenHash: null,
      otpType: null,
      code: null,
    })

    expect(result).toEqual({ ok: false })
  })

  it('requires BOTH accessToken and refreshToken — one alone falls through to the getSession check, not setSession', async () => {
    const setSession = vi.fn().mockResolvedValue({ error: null })
    const getSession = vi.fn().mockResolvedValue({ data: { session: null } })
    const supabase = fakeSupabase({ setSession, getSession })

    const result = await verifyRecoveryLink(supabase, {
      tokenHash: null,
      otpType: null,
      code: null,
      accessToken: 'at-only',
    })

    expect(setSession).not.toHaveBeenCalled()
    expect(getSession).toHaveBeenCalled()
    expect(result).toEqual({ ok: false })
  })
})

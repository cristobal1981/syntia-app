import { describe, expect, it, vi, beforeEach } from 'vitest'

import {
  buildPortalAccessUrlFromToken,
  deliverClientAccessEmail,
  generatePortalAccessLink,
  getPortalAccessRedirectUrl,
  sendClientAccessEmailForClient,
} from '@/src/modules/directory/infrastructure/client-access-link'

const {
  createSupabaseAdminClient,
  sendClientAccessEmail,
  isResendConfigured,
  shouldSkipClientInviteEmail,
  shouldUseResendClientInvite,
  getSiteUrl,
  generateLink,
  resetPasswordForEmail,
} = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
  sendClientAccessEmail: vi.fn(),
  isResendConfigured: vi.fn(),
  shouldSkipClientInviteEmail: vi.fn(),
  shouldUseResendClientInvite: vi.fn(),
  getSiteUrl: vi.fn(() => 'https://portal.example.com'),
  generateLink: vi.fn(),
  resetPasswordForEmail: vi.fn(),
}))

vi.mock('@/src/modules/auth/infrastructure/supabase/env', () => ({ getSiteUrl }))
vi.mock('@/src/modules/email/application/send-client-access-email', () => ({
  sendClientAccessEmail,
}))
vi.mock('@/src/modules/email/infrastructure/resend-env', () => ({ isResendConfigured }))
vi.mock('@/src/modules/directory/infrastructure/directory-env', () => ({
  shouldSkipClientInviteEmail,
  shouldUseResendClientInvite,
}))
vi.mock('@/src/modules/directory/infrastructure/supabase-admin', () => ({
  createSupabaseAdminClient,
}))

beforeEach(() => {
  vi.resetAllMocks()
  getSiteUrl.mockReturnValue('https://portal.example.com')
  createSupabaseAdminClient.mockReturnValue({
    auth: {
      admin: { generateLink },
      resetPasswordForEmail,
    },
  })
})

describe('getPortalAccessRedirectUrl / buildPortalAccessUrlFromToken', () => {
  it('always points at /login/restablecer under the configured site URL', () => {
    expect(getPortalAccessRedirectUrl()).toBe('https://portal.example.com/login/restablecer')
  })

  it('builds a direct token_hash link, not the raw PKCE action_link shape', () => {
    const url = buildPortalAccessUrlFromToken('abc123', 'invite')
    const parsed = new URL(url)

    expect(parsed.pathname).toBe('/login/restablecer')
    expect(parsed.searchParams.get('token_hash')).toBe('abc123')
    expect(parsed.searchParams.get('type')).toBe('invite')
    expect(parsed.searchParams.get('code')).toBeNull()
  })
})

describe('generatePortalAccessLink', () => {
  it('normalizes the email (trim + lowercase) before asking Supabase to generate a link', async () => {
    generateLink.mockResolvedValue({
      data: { user: { id: 'u1' }, properties: { hashed_token: 'tok' } },
      error: null,
    })

    await generatePortalAccessLink('  Alice@Example.com  ', 'invite')

    expect(generateLink).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'alice@example.com', type: 'invite' })
    )
  })

  it('PREFERS the hashed_token direct link over action_link (avoids the PKCE code_verifier mismatch)', async () => {
    generateLink.mockResolvedValue({
      data: {
        user: { id: 'u1' },
        properties: {
          hashed_token: 'direct-token',
          action_link: 'https://supabase.example/auth/v1/verify?code=pkce-code',
        },
      },
      error: null,
    })

    const link = await generatePortalAccessLink('user@example.com', 'recovery')

    expect(link).toContain('token_hash=direct-token')
    expect(link).not.toContain('pkce-code')
  })

  it('falls back to action_link only when hashed_token is absent', async () => {
    generateLink.mockResolvedValue({
      data: {
        user: { id: 'u1' },
        properties: { action_link: 'https://supabase.example/auth/v1/verify?code=pkce-code' },
      },
      error: null,
    })

    const link = await generatePortalAccessLink('user@example.com', 'recovery')

    expect(link).toBe('https://supabase.example/auth/v1/verify?code=pkce-code')
  })

  it('throws when Supabase reports an error generating the link', async () => {
    generateLink.mockResolvedValue({ data: { user: null }, error: { message: 'boom' } })

    await expect(generatePortalAccessLink('user@example.com', 'invite')).rejects.toThrow('boom')
  })

  it('throws when neither hashed_token nor action_link comes back, even with no explicit error', async () => {
    generateLink.mockResolvedValue({ data: { user: { id: 'u1' }, properties: {} }, error: null })

    await expect(generatePortalAccessLink('user@example.com', 'invite')).rejects.toThrow()
  })
})

describe('deliverClientAccessEmail', () => {
  it('generates the link then hands it to sendClientAccessEmail with the right purpose mapping', async () => {
    generateLink.mockResolvedValue({
      data: { user: { id: 'u1' }, properties: { hashed_token: 'tok' } },
      error: null,
    })

    await deliverClientAccessEmail('User@Example.com', 'invite')

    expect(sendClientAccessEmail).toHaveBeenCalledWith({
      clientEmail: 'user@example.com',
      accessLink: expect.stringContaining('token_hash=tok'),
      purpose: 'invite',
    })
  })

  it('maps a "recovery" linkType to a "recovery" purpose', async () => {
    generateLink.mockResolvedValue({
      data: { user: { id: 'u1' }, properties: { hashed_token: 'tok' } },
      error: null,
    })

    await deliverClientAccessEmail('user@example.com', 'recovery')

    expect(sendClientAccessEmail).toHaveBeenCalledWith(
      expect.objectContaining({ purpose: 'recovery' })
    )
  })
})

describe('sendClientAccessEmailForClient (three mutually exclusive delivery paths)', () => {
  it('PRIORITY: Resend wins over the skip-email flag when both are set', async () => {
    shouldUseResendClientInvite.mockReturnValue(true)
    shouldSkipClientInviteEmail.mockReturnValue(true)
    isResendConfigured.mockReturnValue(true)
    generateLink.mockResolvedValue({
      data: { user: { id: 'u1' }, properties: { hashed_token: 'tok' } },
      error: null,
    })

    await expect(sendClientAccessEmailForClient('user@example.com')).resolves.toBeUndefined()
    expect(sendClientAccessEmail).toHaveBeenCalled()
    expect(resetPasswordForEmail).not.toHaveBeenCalled()
  })

  it('Resend path throws a distinct error when RESEND_API_KEY is set but Resend itself is not fully configured', async () => {
    shouldUseResendClientInvite.mockReturnValue(true)
    isResendConfigured.mockReturnValue(false)

    await expect(sendClientAccessEmailForClient('user@example.com')).rejects.toThrow(
      'RESEND_NOT_CONFIGURED'
    )
    expect(generateLink).not.toHaveBeenCalled()
  })

  it('the dev-only skip flag throws INVITE_EMAIL_DISABLED instead of silently no-opping — callers must handle it explicitly', async () => {
    shouldUseResendClientInvite.mockReturnValue(false)
    shouldSkipClientInviteEmail.mockReturnValue(true)

    await expect(sendClientAccessEmailForClient('user@example.com')).rejects.toThrow(
      'INVITE_EMAIL_DISABLED'
    )
  })

  it('default path uses Supabase resetPasswordForEmail with the normalized email and the restablecer redirect', async () => {
    shouldUseResendClientInvite.mockReturnValue(false)
    shouldSkipClientInviteEmail.mockReturnValue(false)
    resetPasswordForEmail.mockResolvedValue({ error: null })

    await sendClientAccessEmailForClient('  User@Example.com  ')

    expect(resetPasswordForEmail).toHaveBeenCalledWith('user@example.com', {
      redirectTo: 'https://portal.example.com/login/restablecer',
    })
  })

  it('maps a Supabase rate-limit error to a distinct EMAIL_RATE_LIMIT so the UI can show a specific message', async () => {
    shouldUseResendClientInvite.mockReturnValue(false)
    shouldSkipClientInviteEmail.mockReturnValue(false)
    resetPasswordForEmail.mockResolvedValue({
      error: { message: 'Email rate limit exceeded' },
    })

    await expect(sendClientAccessEmailForClient('user@example.com')).rejects.toThrow(
      'EMAIL_RATE_LIMIT'
    )
  })

  it('propagates any other Supabase error message as-is', async () => {
    shouldUseResendClientInvite.mockReturnValue(false)
    shouldSkipClientInviteEmail.mockReturnValue(false)
    resetPasswordForEmail.mockResolvedValue({ error: { message: 'SMTP down' } })

    await expect(sendClientAccessEmailForClient('user@example.com')).rejects.toThrow('SMTP down')
  })
})

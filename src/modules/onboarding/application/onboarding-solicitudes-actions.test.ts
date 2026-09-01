import { describe, expect, it, vi, beforeEach } from 'vitest'

import type { PortalSession } from '@/src/modules/auth/domain/types'
import type { ClientRecord, DirectoryListScope } from '@/src/modules/directory/domain/types'
import type { OnboardingFormAccessToken } from '@/src/modules/onboarding/onboarding-token-repository.supabase'
import {
  createAltaAutonomoAccessLinkAction,
  createAltaAutonomoAccessLinkCore,
  deleteOnboardingSolicitudAction,
  getOnboardingSolicitudDetailAction,
  listOnboardingSolicitudesAction,
  renewExpiredOnboardingSolicitudAction,
  resendOnboardingSolicitudLinkAction,
  revokeOnboardingSolicitudAction,
} from '@/src/modules/onboarding/application/onboarding-solicitudes-actions'

const {
  requireDirectorySession,
  buildDirectoryScope,
  listClients,
  createOnboardingFormAccessToken,
  deleteOnboardingFormAccessToken,
  getOnboardingFormAccessTokenByToken,
  listOnboardingFormAccessTokens,
  recordOnboardingEmailSent,
  revokeOnboardingFormAccessToken,
  sendAltaAutonomoAccessEmail,
  isResendConfigured,
  buildOnboardingAccessUrl,
} = vi.hoisted(() => ({
  requireDirectorySession: vi.fn(),
  buildDirectoryScope: vi.fn(),
  listClients: vi.fn(),
  createOnboardingFormAccessToken: vi.fn(),
  deleteOnboardingFormAccessToken: vi.fn(),
  getOnboardingFormAccessTokenByToken: vi.fn(),
  listOnboardingFormAccessTokens: vi.fn(),
  recordOnboardingEmailSent: vi.fn(),
  revokeOnboardingFormAccessToken: vi.fn(),
  sendAltaAutonomoAccessEmail: vi.fn(),
  isResendConfigured: vi.fn(),
  buildOnboardingAccessUrl: vi.fn(),
}))

vi.mock('@/src/modules/directory/application/directory-queries', () => ({
  requireDirectorySession,
  buildDirectoryScope,
}))
vi.mock('@/src/modules/directory/infrastructure/get-directory-repository', () => ({
  getDirectoryRepository: () => ({ listClients }),
}))
vi.mock('@/src/modules/onboarding/onboarding-token-repository.supabase', () => ({
  createOnboardingFormAccessToken,
  deleteOnboardingFormAccessToken,
  getOnboardingFormAccessTokenByToken,
  listOnboardingFormAccessTokens,
  recordOnboardingEmailSent,
  revokeOnboardingFormAccessToken,
}))
vi.mock('@/src/modules/email/application/send-alta-autonomo-access-email', () => ({
  sendAltaAutonomoAccessEmail,
}))
vi.mock('@/src/modules/email/infrastructure/resend-env', () => ({ isResendConfigured }))
vi.mock('@/src/modules/onboarding/infrastructure/landing-url', () => ({
  buildOnboardingAccessUrl,
}))

function sessionFor(role: 'admin' | 'advisor' | 'client' | 'worker'): PortalSession {
  return {
    user: { id: `auth-${role}`, email: `${role}@example.com`, name: role, role },
    expiresAt: Date.now() + 100000,
  }
}

function scopeFor(role: DirectoryListScope['role'], userId: string): DirectoryListScope {
  return { role, userId }
}

function tokenRecord(
  overrides: Partial<OnboardingFormAccessToken> = {}
): OnboardingFormAccessToken {
  return {
    id: 1,
    token: 'tok-abc',
    form_kind: 'alta_autonomo',
    recipient_email: 'cliente@example.com',
    recipient_name: 'Cliente Uno',
    odoo_partner_id: null,
    expires_at: '2099-01-01T00:00:00.000Z',
    used_at: null,
    revoked_at: null,
    created_by: 'staff-1',
    created_at: '2026-01-01T00:00:00.000Z',
    resend_email_id: null,
    email_sent_at: null,
    email_delivered_at: null,
    email_opened_at: null,
    email_clicked_at: null,
    email_bounced_at: null,
    email_complained_at: null,
    email_subject: null,
    email_html: null,
    ...overrides,
  }
}

function client(overrides: Partial<ClientRecord> = {}): ClientRecord {
  return {
    id: 'client-1',
    name: 'Cliente Portal',
    email: 'portal@example.com',
    clientKind: 'person',
    firstName: 'Cliente',
    firstSurname: 'Portal',
    status: 'active',
    ...overrides,
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  buildOnboardingAccessUrl.mockImplementation((token: string) => `https://landing/${token}`)
  isResendConfigured.mockReturnValue(true)
  listClients.mockResolvedValue([])
  // createAltaAutonomoAccessLinkCore does `revokeOnboardingFormAccessToken(...).catch(...)`
  // on its cleanup paths — needs a real Promise by default, not undefined.
  revokeOnboardingFormAccessToken.mockResolvedValue(true)
})

// ---------------------------------------------------------------------------
// Session gate: requireSolicitudesSession blocks BOTH client and worker
// (unlike some other directory actions that only check role==='client')
// ---------------------------------------------------------------------------

describe('requireSolicitudesSession (via listOnboardingSolicitudesAction)', () => {
  it.each(['client', 'worker'] as const)(
    'returns forbidden for role=%s',
    async (role) => {
      requireDirectorySession.mockResolvedValue(sessionFor(role))

      const result = await listOnboardingSolicitudesAction()

      expect(result).toEqual({ ok: false, error: 'forbidden' })
      expect(listOnboardingFormAccessTokens).not.toHaveBeenCalled()
    }
  )

  it.each(['admin', 'advisor'] as const)('allows role=%s', async (role) => {
    requireDirectorySession.mockResolvedValue(sessionFor(role))
    listOnboardingFormAccessTokens.mockResolvedValue([])

    const result = await listOnboardingSolicitudesAction()

    expect(result).toEqual({ ok: true, rows: [] })
  })

  it('propagates unauthorized', async () => {
    requireDirectorySession.mockRejectedValue(new Error('unauthorized'))

    const result = await listOnboardingSolicitudesAction()

    expect(result).toEqual({ ok: false, error: 'unauthorized' })
  })
})

// ---------------------------------------------------------------------------
// mapTokenToRow (via getOnboardingSolicitudDetailAction)
// ---------------------------------------------------------------------------

describe('getOnboardingSolicitudDetailAction (row mapping)', () => {
  beforeEach(() => {
    requireDirectorySession.mockResolvedValue(sessionFor('admin'))
  })

  it('returns not_found when the token does not exist', async () => {
    getOnboardingFormAccessTokenByToken.mockResolvedValue(null)

    const result = await getOnboardingSolicitudDetailAction('missing')

    expect(result).toEqual({ ok: false, error: 'not_found' })
  })

  it('returns not_found when the token belongs to a DIFFERENT form_kind — never leaks a foreign token', async () => {
    getOnboardingFormAccessTokenByToken.mockResolvedValue(
      tokenRecord({ form_kind: 'otro_formulario' as OnboardingFormAccessToken['form_kind'] })
    )

    const result = await getOnboardingSolicitudDetailAction('tok-abc')

    expect(result).toEqual({ ok: false, error: 'not_found' })
  })

  it('computes url ONLY for an active token', async () => {
    getOnboardingFormAccessTokenByToken.mockResolvedValue(tokenRecord())

    const result = await getOnboardingSolicitudDetailAction('tok-abc')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.row.status).toBe('active')
      expect(result.row.url).toBe('https://landing/tok-abc')
    }
  })

  it('url is null for a non-active token (used/revoked/expired), even though buildOnboardingAccessUrl would resolve one', async () => {
    getOnboardingFormAccessTokenByToken.mockResolvedValue(
      tokenRecord({ used_at: '2026-02-01T00:00:00.000Z' })
    )

    const result = await getOnboardingSolicitudDetailAction('tok-abc')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.row.status).toBe('used')
      expect(result.row.url).toBeNull()
    }
  })

  it('carries emailSubject/emailHtml through to the row (for the preview feature)', async () => {
    getOnboardingFormAccessTokenByToken.mockResolvedValue(
      tokenRecord({ email_subject: 'Asunto', email_html: '<p>Hola</p>' })
    )

    const result = await getOnboardingSolicitudDetailAction('tok-abc')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.row.emailSubject).toBe('Asunto')
      expect(result.row.emailHtml).toBe('<p>Hola</p>')
    }
  })
})

// ---------------------------------------------------------------------------
// resendOnboardingSolicitudLinkAction
// ---------------------------------------------------------------------------

describe('resendOnboardingSolicitudLinkAction', () => {
  beforeEach(() => {
    requireDirectorySession.mockResolvedValue(sessionFor('admin'))
    buildDirectoryScope.mockResolvedValue(scopeFor('admin', 'admin-1'))
  })

  it('returns not_found when the token does not exist', async () => {
    getOnboardingFormAccessTokenByToken.mockResolvedValue(null)

    const result = await resendOnboardingSolicitudLinkAction('tok-abc')

    expect(result).toEqual({ ok: false, error: 'not_found' })
    expect(sendAltaAutonomoAccessEmail).not.toHaveBeenCalled()
  })

  it('returns not_active for a non-active token (used/revoked/expired) — refuses to resend a dead link', async () => {
    getOnboardingFormAccessTokenByToken.mockResolvedValue(
      tokenRecord({ revoked_at: '2026-02-01T00:00:00.000Z' })
    )

    const result = await resendOnboardingSolicitudLinkAction('tok-abc')

    expect(result).toEqual({ ok: false, error: 'not_active' })
    expect(sendAltaAutonomoAccessEmail).not.toHaveBeenCalled()
  })

  it('uses the matched portal client email/name OVER the ones stored on the token, when one is found', async () => {
    getOnboardingFormAccessTokenByToken.mockResolvedValue(
      tokenRecord({ odoo_partner_id: 42, recipient_email: 'stale@example.com' })
    )
    listClients.mockResolvedValue([
      client({ odooPartnerId: '42', email: 'fresh@example.com', name: 'Nombre Fresco' }),
    ])
    sendAltaAutonomoAccessEmail.mockResolvedValue({
      emailId: 'email-1',
      subject: 'Asunto',
      html: '<p>Hola</p>',
    })

    await resendOnboardingSolicitudLinkAction('tok-abc')

    expect(sendAltaAutonomoAccessEmail).toHaveBeenCalledWith(
      expect.objectContaining({ clientEmail: 'fresh@example.com' })
    )
    expect(recordOnboardingEmailSent).toHaveBeenCalledWith('tok-abc', 'email-1', {
      recipientEmail: 'fresh@example.com',
      recipientName: 'Nombre Fresco',
      emailSubject: 'Asunto',
      emailHtml: '<p>Hola</p>',
    })
  })

  it('falls back to the token-stored email/name when no portal client matches', async () => {
    getOnboardingFormAccessTokenByToken.mockResolvedValue(tokenRecord())
    listClients.mockResolvedValue([])
    sendAltaAutonomoAccessEmail.mockResolvedValue({
      emailId: 'email-1',
      subject: 'Asunto',
      html: '<p>Hola</p>',
    })

    await resendOnboardingSolicitudLinkAction('tok-abc')

    expect(sendAltaAutonomoAccessEmail).toHaveBeenCalledWith(
      expect.objectContaining({ clientEmail: 'cliente@example.com' })
    )
  })

  it('returns unknown with a specific message when there is no destination email at all', async () => {
    getOnboardingFormAccessTokenByToken.mockResolvedValue(
      tokenRecord({ recipient_email: null })
    )
    listClients.mockResolvedValue([])

    const result = await resendOnboardingSolicitudLinkAction('tok-abc')

    expect(result).toEqual({
      ok: false,
      error: 'unknown',
      message: 'La solicitud no tiene un correo de destino.',
    })
  })

  it('returns unknown when the landing URL cannot be built', async () => {
    getOnboardingFormAccessTokenByToken.mockResolvedValue(tokenRecord())
    buildOnboardingAccessUrl.mockReturnValue(null)

    const result = await resendOnboardingSolicitudLinkAction('tok-abc')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('unknown')
    expect(sendAltaAutonomoAccessEmail).not.toHaveBeenCalled()
  })

  it('returns email_failed when Resend is not configured, WITHOUT attempting to send', async () => {
    getOnboardingFormAccessTokenByToken.mockResolvedValue(tokenRecord())
    isResendConfigured.mockReturnValue(false)

    const result = await resendOnboardingSolicitudLinkAction('tok-abc')

    expect(result).toEqual({
      ok: false,
      error: 'email_failed',
      message: 'Resend no está configurado. No se pudo enviar el correo al cliente.',
    })
    expect(sendAltaAutonomoAccessEmail).not.toHaveBeenCalled()
  })

  it('maps a send failure to email_failed and does NOT record anything as sent', async () => {
    getOnboardingFormAccessTokenByToken.mockResolvedValue(tokenRecord())
    sendAltaAutonomoAccessEmail.mockRejectedValue(new Error('RESEND_NOT_CONFIGURED'))

    const result = await resendOnboardingSolicitudLinkAction('tok-abc')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('email_failed')
    expect(recordOnboardingEmailSent).not.toHaveBeenCalled()
  })

  it('succeeds and records the sent email including subject/html', async () => {
    getOnboardingFormAccessTokenByToken.mockResolvedValue(tokenRecord())
    sendAltaAutonomoAccessEmail.mockResolvedValue({
      emailId: 'email-1',
      subject: 'Asunto',
      html: '<p>Hola</p>',
    })

    const result = await resendOnboardingSolicitudLinkAction('tok-abc')

    expect(result).toEqual({ ok: true })
  })
})

// ---------------------------------------------------------------------------
// createAltaAutonomoAccessLinkCore (no session — used by UI action AND the
// Odoo webhook)
// ---------------------------------------------------------------------------

describe('createAltaAutonomoAccessLinkCore', () => {
  const scope = scopeFor('advisor', 'advisor-1')

  it('refuses to create anything when Resend is not configured (no orphan token)', async () => {
    isResendConfigured.mockReturnValue(false)

    const result = await createAltaAutonomoAccessLinkCore(
      { odooPartnerId: 1, label: 'Contacto', contactEmail: 'x@example.com' },
      scope
    )

    expect(result).toEqual({
      ok: false,
      error: 'email_failed',
      message: 'Resend no está configurado. No se pudo enviar el correo al cliente.',
    })
    expect(createOnboardingFormAccessToken).not.toHaveBeenCalled()
  })

  it('prefers the matched PORTAL client email over the raw Odoo email', async () => {
    listClients.mockResolvedValue([
      client({ odooPartnerId: '7', email: 'portal@example.com', name: 'Portal Name' }),
    ])
    createOnboardingFormAccessToken.mockResolvedValue({
      token: 'new-tok',
      expires_at: '2099-01-01T00:00:00.000Z',
    })
    sendAltaAutonomoAccessEmail.mockResolvedValue({
      emailId: 'email-1',
      subject: 'Asunto',
      html: '<p>Hola</p>',
    })

    await createAltaAutonomoAccessLinkCore(
      { odooPartnerId: 7, label: 'Contacto', contactEmail: 'odoo@example.com' },
      scope
    )

    expect(createOnboardingFormAccessToken).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientEmail: 'portal@example.com',
        recipientName: 'Portal Name',
      })
    )
  })

  it('returns invalid_client when there is no email to send to at all', async () => {
    const result = await createAltaAutonomoAccessLinkCore(
      { odooPartnerId: 1, label: 'Contacto' },
      scope
    )

    expect(result).toEqual({
      ok: false,
      error: 'invalid_client',
      message: 'Este contacto no tiene un correo de destino.',
    })
    expect(createOnboardingFormAccessToken).not.toHaveBeenCalled()
  })

  it('REVOKES the just-created token when the landing URL cannot be built — no orphan token left behind', async () => {
    createOnboardingFormAccessToken.mockResolvedValue({
      token: 'new-tok',
      expires_at: '2099-01-01T00:00:00.000Z',
    })
    buildOnboardingAccessUrl.mockReturnValue(null)

    const result = await createAltaAutonomoAccessLinkCore(
      { odooPartnerId: 1, label: 'Contacto', contactEmail: 'x@example.com' },
      scope
    )

    expect(result.ok).toBe(false)
    expect(revokeOnboardingFormAccessToken).toHaveBeenCalledWith('new-tok')
    expect(sendAltaAutonomoAccessEmail).not.toHaveBeenCalled()
  })

  it('REVOKES the just-created token when sending the email fails — no orphan, unusable token left behind', async () => {
    createOnboardingFormAccessToken.mockResolvedValue({
      token: 'new-tok',
      expires_at: '2099-01-01T00:00:00.000Z',
    })
    sendAltaAutonomoAccessEmail.mockRejectedValue(new Error('boom'))

    const result = await createAltaAutonomoAccessLinkCore(
      { odooPartnerId: 1, label: 'Contacto', contactEmail: 'x@example.com' },
      scope
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('email_failed')
    expect(revokeOnboardingFormAccessToken).toHaveBeenCalledWith('new-tok')
  })

  it('does NOT revoke anything when createOnboardingFormAccessToken itself fails (nothing was created)', async () => {
    createOnboardingFormAccessToken.mockRejectedValue(new Error('db down'))

    await createAltaAutonomoAccessLinkCore(
      { odooPartnerId: 1, label: 'Contacto', contactEmail: 'x@example.com' },
      scope
    )

    expect(revokeOnboardingFormAccessToken).not.toHaveBeenCalled()
  })

  it('succeeds end-to-end, persisting the sent email subject/html and reporting emailSent:true', async () => {
    createOnboardingFormAccessToken.mockResolvedValue({
      token: 'new-tok',
      expires_at: '2099-01-01T00:00:00.000Z',
    })
    sendAltaAutonomoAccessEmail.mockResolvedValue({
      emailId: 'email-1',
      subject: 'Asunto',
      html: '<p>Hola</p>',
    })

    const result = await createAltaAutonomoAccessLinkCore(
      { odooPartnerId: 1, label: 'Contacto', contactEmail: 'x@example.com' },
      scope
    )

    expect(result).toEqual({
      ok: true,
      url: 'https://landing/new-tok',
      token: 'new-tok',
      expiresAt: '2099-01-01T00:00:00.000Z',
      emailSent: true,
    })
    expect(recordOnboardingEmailSent).toHaveBeenCalledWith('new-tok', 'email-1', {
      emailSubject: 'Asunto',
      emailHtml: '<p>Hola</p>',
    })
  })
})

describe('createAltaAutonomoAccessLinkAction (session-gated wrapper around Core)', () => {
  it.each(['client', 'worker'] as const)(
    'returns forbidden for role=%s, never reaching Core',
    async (role) => {
      requireDirectorySession.mockResolvedValue(sessionFor(role))

      const result = await createAltaAutonomoAccessLinkAction({
        odooPartnerId: 1,
        label: 'Contacto',
        contactEmail: 'x@example.com',
      })

      expect(result).toEqual({ ok: false, error: 'forbidden' })
      expect(createOnboardingFormAccessToken).not.toHaveBeenCalled()
    }
  )

  it('lets staff through to Core', async () => {
    requireDirectorySession.mockResolvedValue(sessionFor('advisor'))
    buildDirectoryScope.mockResolvedValue(scopeFor('advisor', 'advisor-1'))
    createOnboardingFormAccessToken.mockResolvedValue({
      token: 'new-tok',
      expires_at: '2099-01-01T00:00:00.000Z',
    })
    sendAltaAutonomoAccessEmail.mockResolvedValue({
      emailId: 'email-1',
      subject: 'Asunto',
      html: '<p>Hola</p>',
    })

    const result = await createAltaAutonomoAccessLinkAction({
      odooPartnerId: 1,
      label: 'Contacto',
      contactEmail: 'x@example.com',
    })

    expect(result.ok).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// renewExpiredOnboardingSolicitudAction (quick "renew and resend" for an
// EXPIRED solicitud — reuses createAltaAutonomoAccessLinkCore under the hood
// instead of extending the dead token's own expiry)
// ---------------------------------------------------------------------------

describe('renewExpiredOnboardingSolicitudAction', () => {
  beforeEach(() => {
    requireDirectorySession.mockResolvedValue(sessionFor('admin'))
    buildDirectoryScope.mockResolvedValue(scopeFor('admin', 'admin-1'))
  })

  it.each(['client', 'worker'] as const)(
    'returns forbidden for role=%s, never touching the token',
    async (role) => {
      requireDirectorySession.mockResolvedValue(sessionFor(role))

      const result = await renewExpiredOnboardingSolicitudAction('tok-abc')

      expect(result).toEqual({ ok: false, error: 'forbidden' })
      expect(getOnboardingFormAccessTokenByToken).not.toHaveBeenCalled()
    }
  )

  it('returns not_found when the token does not exist', async () => {
    getOnboardingFormAccessTokenByToken.mockResolvedValue(null)

    const result = await renewExpiredOnboardingSolicitudAction('tok-abc')

    expect(result).toEqual({ ok: false, error: 'not_found' })
  })

  it('returns not_found for a token belonging to a different form_kind', async () => {
    getOnboardingFormAccessTokenByToken.mockResolvedValue(
      tokenRecord({
        expires_at: '2020-01-01T00:00:00.000Z',
        form_kind: 'otro_formulario' as OnboardingFormAccessToken['form_kind'],
      })
    )

    const result = await renewExpiredOnboardingSolicitudAction('tok-abc')

    expect(result).toEqual({ ok: false, error: 'not_found' })
  })

  it.each([
    ['active', tokenRecord()],
    ['used', tokenRecord({ used_at: '2026-02-01T00:00:00.000Z' })],
    ['revoked', tokenRecord({ revoked_at: '2026-02-01T00:00:00.000Z' })],
  ] as const)(
    'refuses to "renew" a token that is NOT expired (status=%s) — this action is only for dead links',
    async (_label, record) => {
      getOnboardingFormAccessTokenByToken.mockResolvedValue(record)

      const result = await renewExpiredOnboardingSolicitudAction('tok-abc')

      expect(result).toEqual({ ok: false, error: 'not_expired' })
      expect(createOnboardingFormAccessToken).not.toHaveBeenCalled()
    }
  )

  it('returns invalid_client, without creating anything, when the expired token has no linked Odoo contact', async () => {
    getOnboardingFormAccessTokenByToken.mockResolvedValue(
      tokenRecord({ expires_at: '2020-01-01T00:00:00.000Z', odoo_partner_id: null })
    )

    const result = await renewExpiredOnboardingSolicitudAction('tok-abc')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('invalid_client')
    expect(createOnboardingFormAccessToken).not.toHaveBeenCalled()
  })

  it('creates a fresh token for the SAME odoo_partner_id/recipient as the expired one, without any contact picker', async () => {
    getOnboardingFormAccessTokenByToken.mockResolvedValue(
      tokenRecord({
        expires_at: '2020-01-01T00:00:00.000Z',
        odoo_partner_id: 42,
        recipient_email: 'viejo@example.com',
        recipient_name: 'Nombre Viejo',
      })
    )
    createOnboardingFormAccessToken.mockResolvedValue({
      token: 'new-tok',
      expires_at: '2099-01-01T00:00:00.000Z',
    })
    sendAltaAutonomoAccessEmail.mockResolvedValue({
      emailId: 'email-1',
      subject: 'Asunto',
      html: '<p>Hola</p>',
    })

    const result = await renewExpiredOnboardingSolicitudAction('tok-abc')

    expect(createOnboardingFormAccessToken).toHaveBeenCalledWith(
      expect.objectContaining({
        odooPartnerId: 42,
        recipientEmail: 'viejo@example.com',
        recipientName: 'Nombre Viejo',
      })
    )
    expect(result).toEqual({
      ok: true,
      url: 'https://landing/new-tok',
      token: 'new-tok',
      expiresAt: '2099-01-01T00:00:00.000Z',
      emailSent: true,
    })
  })

  it('falls back to recipient_email as the label when recipient_name is missing', async () => {
    getOnboardingFormAccessTokenByToken.mockResolvedValue(
      tokenRecord({
        expires_at: '2020-01-01T00:00:00.000Z',
        odoo_partner_id: 42,
        recipient_email: 'viejo@example.com',
        recipient_name: null,
      })
    )
    createOnboardingFormAccessToken.mockResolvedValue({
      token: 'new-tok',
      expires_at: '2099-01-01T00:00:00.000Z',
    })
    sendAltaAutonomoAccessEmail.mockResolvedValue({
      emailId: 'email-1',
      subject: 'Asunto',
      html: '<p>Hola</p>',
    })

    await renewExpiredOnboardingSolicitudAction('tok-abc')

    expect(createOnboardingFormAccessToken).toHaveBeenCalledWith(
      expect.objectContaining({ recipientName: 'viejo@example.com' })
    )
  })

  it('propagates a Core failure (e.g. Resend not configured) as-is, without swallowing it', async () => {
    getOnboardingFormAccessTokenByToken.mockResolvedValue(
      tokenRecord({ expires_at: '2020-01-01T00:00:00.000Z', odoo_partner_id: 42 })
    )
    isResendConfigured.mockReturnValue(false)

    const result = await renewExpiredOnboardingSolicitudAction('tok-abc')

    expect(result).toEqual({
      ok: false,
      error: 'email_failed',
      message: 'Resend no está configurado. No se pudo enviar el correo al cliente.',
    })
  })
})

// ---------------------------------------------------------------------------
// revoke / delete
// ---------------------------------------------------------------------------

describe('revokeOnboardingSolicitudAction', () => {
  it('returns forbidden for role=client', async () => {
    requireDirectorySession.mockResolvedValue(sessionFor('client'))

    const result = await revokeOnboardingSolicitudAction('tok-abc')

    expect(result).toEqual({ ok: false, error: 'forbidden' })
    expect(revokeOnboardingFormAccessToken).not.toHaveBeenCalled()
  })

  it('returns not_found when nothing matched', async () => {
    requireDirectorySession.mockResolvedValue(sessionFor('admin'))
    revokeOnboardingFormAccessToken.mockResolvedValue(false)

    const result = await revokeOnboardingSolicitudAction('tok-abc')

    expect(result).toEqual({ ok: false, error: 'not_found' })
  })

  it('succeeds when a row was revoked', async () => {
    requireDirectorySession.mockResolvedValue(sessionFor('admin'))
    revokeOnboardingFormAccessToken.mockResolvedValue(true)

    const result = await revokeOnboardingSolicitudAction('tok-abc')

    expect(result).toEqual({ ok: true })
  })
})

describe('deleteOnboardingSolicitudAction', () => {
  it('returns forbidden for role=worker', async () => {
    requireDirectorySession.mockResolvedValue(sessionFor('worker'))

    const result = await deleteOnboardingSolicitudAction('tok-abc')

    expect(result).toEqual({ ok: false, error: 'forbidden' })
    expect(deleteOnboardingFormAccessToken).not.toHaveBeenCalled()
  })

  it('returns not_found when nothing matched', async () => {
    requireDirectorySession.mockResolvedValue(sessionFor('admin'))
    deleteOnboardingFormAccessToken.mockResolvedValue(false)

    const result = await deleteOnboardingSolicitudAction('tok-abc')

    expect(result).toEqual({ ok: false, error: 'not_found' })
  })

  it('succeeds when a row was deleted', async () => {
    requireDirectorySession.mockResolvedValue(sessionFor('admin'))
    deleteOnboardingFormAccessToken.mockResolvedValue(true)

    const result = await deleteOnboardingSolicitudAction('tok-abc')

    expect(result).toEqual({ ok: true })
  })
})

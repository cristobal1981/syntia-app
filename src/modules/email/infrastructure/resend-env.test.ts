import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  getInviteRecipientEmail,
  getResendFromEmail,
  isInviteRecipientOverridden,
  isResendConfigured,
} from '@/src/modules/email/infrastructure/resend-env'

beforeEach(() => {
  vi.resetAllMocks()
  vi.unstubAllEnvs()
  vi.stubEnv('RESEND_API_KEY', '')
  vi.stubEnv('RESEND_FROM_EMAIL', '')
  vi.stubEnv('RESEND_INVITE_OVERRIDE_TO', '')
  vi.stubEnv('VERCEL_ENV', '')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('isResendConfigured', () => {
  it('es true solo con API key y remitente', () => {
    vi.stubEnv('RESEND_API_KEY', 're_123')
    vi.stubEnv('RESEND_FROM_EMAIL', 'a@syntia.test')
    expect(isResendConfigured()).toBe(true)
  })

  it('es false sin API key', () => {
    vi.stubEnv('RESEND_FROM_EMAIL', 'a@syntia.test')
    expect(isResendConfigured()).toBe(false)
  })

  it('es false con API key solo espacios', () => {
    vi.stubEnv('RESEND_API_KEY', '   ')
    vi.stubEnv('RESEND_FROM_EMAIL', 'a@syntia.test')
    expect(isResendConfigured()).toBe(false)
  })

  it('es false sin remitente', () => {
    vi.stubEnv('RESEND_API_KEY', 're_123')
    expect(isResendConfigured()).toBe(false)
  })

  it('es false con remitente que son solo comillas vacías', () => {
    vi.stubEnv('RESEND_API_KEY', 're_123')
    vi.stubEnv('RESEND_FROM_EMAIL', '""')
    expect(isResendConfigured()).toBe(false)
  })
})

describe('getResendFromEmail', () => {
  it('quita comillas dobles y simples y espacios', () => {
    vi.stubEnv('RESEND_FROM_EMAIL', '  "Syntia <a@syntia.test>"  ')
    expect(getResendFromEmail()).toBe('Syntia <a@syntia.test>')
    vi.stubEnv('RESEND_FROM_EMAIL', "'b@syntia.test'")
    expect(getResendFromEmail()).toBe('b@syntia.test')
  })

  it('no quita comillas desparejadas', () => {
    vi.stubEnv('RESEND_FROM_EMAIL', '"a@syntia.test')
    expect(getResendFromEmail()).toBe('"a@syntia.test')
  })

  it('lanza si no está configurado', () => {
    expect(() => getResendFromEmail()).toThrow('RESEND_FROM_EMAIL is not configured')
  })
})

describe('getInviteRecipientEmail / isInviteRecipientOverridden', () => {
  it('sin override devuelve el email del cliente recortado y en minúsculas', () => {
    expect(getInviteRecipientEmail('  Ana@Example.COM ')).toBe('ana@example.com')
    expect(isInviteRecipientOverridden()).toBe(false)
  })

  it('con override redirige al destinatario del override', () => {
    vi.stubEnv('RESEND_INVITE_OVERRIDE_TO', '"sandbox@example.com"')
    expect(getInviteRecipientEmail('ana@example.com')).toBe('sandbox@example.com')
    expect(isInviteRecipientOverridden()).toBe(true)
  })

  it('en producción de Vercel el override NUNCA se aplica', () => {
    vi.stubEnv('RESEND_INVITE_OVERRIDE_TO', 'sandbox@example.com')
    vi.stubEnv('VERCEL_ENV', 'production')
    expect(getInviteRecipientEmail('Ana@example.com')).toBe('ana@example.com')
    expect(isInviteRecipientOverridden()).toBe(false)
  })

  it('en preview el override sí se aplica', () => {
    vi.stubEnv('RESEND_INVITE_OVERRIDE_TO', 'sandbox@example.com')
    vi.stubEnv('VERCEL_ENV', 'preview')
    expect(isInviteRecipientOverridden()).toBe(true)
  })
})

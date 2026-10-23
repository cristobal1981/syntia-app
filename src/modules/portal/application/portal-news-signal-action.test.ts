import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { getSession, resolveDirectoryActorId, resolveClientOdooPartnerId, isOdooApiConfigured, getMaxPortalEventSeqForPartner } =
  vi.hoisted(() => ({
    getSession: vi.fn(),
    resolveDirectoryActorId: vi.fn(),
    resolveClientOdooPartnerId: vi.fn(),
    isOdooApiConfigured: vi.fn(),
    getMaxPortalEventSeqForPartner: vi.fn(),
  }))

vi.mock('@/src/modules/auth/application/get-session', () => ({ getSession }))
vi.mock('@/src/modules/directory/application/resolve-actor-id', () => ({ resolveDirectoryActorId }))
vi.mock('@/src/modules/tramites/application/resolve-client-odoo-partner-id', () => ({ resolveClientOdooPartnerId }))
vi.mock('@/src/modules/portal/infrastructure/odoo-json-client', () => ({ isOdooApiConfigured }))
vi.mock('@/src/modules/push/infrastructure/portal-events.supabase', () => ({ getMaxPortalEventSeqForPartner }))
vi.mock('@/src/modules/portal/application/load-client-portal-notifications', () => ({ loadClientPortalNotifications: vi.fn() }))
vi.mock('@/src/modules/colaboradores/application/get-allowed-sections-for-worker', () => ({ getAllowedSectionsForWorker: vi.fn() }))
vi.mock('@/src/modules/colaboradores/application/mask-dashboard-for-worker', () => ({ filterNotificationsForWorker: vi.fn(), maskStatsForWorker: vi.fn() }))
vi.mock('@/src/modules/portal/infrastructure/chatter-read-state.supabase', () => ({ fetchChatterReadStateForUser: vi.fn(), upsertChatterReadState: vi.fn() }))
vi.mock('@/src/modules/portal/infrastructure/portal-record-watch-state.supabase', () => ({ fetchWatchStateForUser: vi.fn(), upsertWatchStateBatch: vi.fn() }))
vi.mock('@/src/modules/portal/infrastructure/resolve-watchable-ack-state', () => ({ resolveWatchableAckStateFromSnapshots: vi.fn() }))
vi.mock('@/src/modules/portal/infrastructure/portal-record-access', () => ({ verifyClientRecordAccess: vi.fn() }))

import { checkPortalNewsSignalAction } from '@/src/modules/portal/application/portal-chatter-notifications-actions'

const ENV = { signal: process.env.PORTAL_NEWS_SIGNAL, max: process.env.PORTAL_NEWS_FULL_CHECK_MAX_AGE_MS }

beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  process.env.PORTAL_NEWS_SIGNAL = 'events'
  delete process.env.PORTAL_NEWS_FULL_CHECK_MAX_AGE_MS
  getSession.mockResolvedValue({ user: { id: 'u1', email: 'a@b.c', name: 'A', role: 'client' }, expiresAt: Date.now() + 1e5 })
  resolveDirectoryActorId.mockResolvedValue('actor-1')
  resolveClientOdooPartnerId.mockResolvedValue(1233)
  isOdooApiConfigured.mockReturnValue(true)
  getMaxPortalEventSeqForPartner.mockResolvedValue(42)
})

afterEach(() => {
  for (const [key, value] of [['PORTAL_NEWS_SIGNAL', ENV.signal], ['PORTAL_NEWS_FULL_CHECK_MAX_AGE_MS', ENV.max]] as const) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

describe('checkPortalNewsSignalAction', () => {
  it('con la variable apagada responde full sin tocar sesión ni base', async () => {
    delete process.env.PORTAL_NEWS_SIGNAL
    expect(await checkPortalNewsSignalAction()).toEqual({ ok: true, mode: 'full' })
    expect(getSession).not.toHaveBeenCalled()
    expect(getMaxPortalEventSeqForPartner).not.toHaveBeenCalled()
  })

  it('con events devuelve el último seq del cliente de la sesión y el máximo entre comprobaciones', async () => {
    expect(await checkPortalNewsSignalAction()).toEqual({
      ok: true,
      mode: 'events',
      seq: 42,
      fullCheckMaxAgeMs: 300_000,
    })
    expect(getMaxPortalEventSeqForPartner).toHaveBeenCalledWith(1233)
  })

  it('el máximo se puede configurar y un valor absurdo vuelve al de por defecto', async () => {
    process.env.PORTAL_NEWS_FULL_CHECK_MAX_AGE_MS = '120000'
    expect(await checkPortalNewsSignalAction()).toMatchObject({ fullCheckMaxAgeMs: 120_000 })
    process.env.PORTAL_NEWS_FULL_CHECK_MAX_AGE_MS = '5'
    expect(await checkPortalNewsSignalAction()).toMatchObject({ fullCheckMaxAgeMs: 300_000 })
  })

  it('solo para clientes y colaboradores con Odoo vinculado', async () => {
    getSession.mockResolvedValue({ user: { id: 'a', email: 'a@b.c', name: 'A', role: 'advisor' }, expiresAt: Date.now() + 1e5 })
    expect(await checkPortalNewsSignalAction()).toEqual({ ok: false, error: 'forbidden' })
    getSession.mockResolvedValue({ user: { id: 'u1', email: 'a@b.c', name: 'A', role: 'client' }, expiresAt: Date.now() + 1e5 })
    resolveClientOdooPartnerId.mockResolvedValue(null)
    expect(await checkPortalNewsSignalAction()).toEqual({ ok: false, error: 'not_linked' })
    expect(getMaxPortalEventSeqForPartner).not.toHaveBeenCalled()
  })

  it('si la consulta a Supabase falla, cae a la comprobación completa en vez de dejar al cliente sin avisos', async () => {
    getMaxPortalEventSeqForPartner.mockRejectedValue(new Error('boom'))
    expect(await checkPortalNewsSignalAction()).toEqual({ ok: true, mode: 'full' })
  })
})

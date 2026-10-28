import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { fetchPortalNewsSignalContext, fetchPortalSessionContext, getSession, resolveDirectoryActorId, resolveClientOdooPartnerId, isOdooApiConfigured, getMaxPortalEventSeqForPartner, listPortalEventKindsAfter, advanceUserPushCursor } =
  vi.hoisted(() => ({
    fetchPortalNewsSignalContext: vi.fn(),
    fetchPortalSessionContext: vi.fn(),
    advanceUserPushCursor: vi.fn(),
    getSession: vi.fn(),
    resolveDirectoryActorId: vi.fn(),
    resolveClientOdooPartnerId: vi.fn(),
    isOdooApiConfigured: vi.fn(),
    getMaxPortalEventSeqForPartner: vi.fn(),
    listPortalEventKindsAfter: vi.fn(),
  }))

vi.mock('@/src/modules/auth/application/get-session', () => ({ getSession }))
vi.mock('@/src/modules/portal/infrastructure/portal-session-context.supabase', () => ({ fetchPortalNewsSignalContext, fetchPortalSessionContext }))
vi.mock('@/src/modules/directory/application/resolve-actor-id', () => ({ resolveDirectoryActorId }))
vi.mock('@/src/modules/tramites/application/resolve-client-odoo-partner-id', () => ({ resolveClientOdooPartnerId }))
vi.mock('@/src/modules/portal/infrastructure/odoo-json-client', () => ({ isOdooApiConfigured }))
vi.mock('@/src/modules/push/infrastructure/portal-events.supabase', () => ({ getMaxPortalEventSeqForPartner, listPortalEventKindsAfter }))
vi.mock('@/src/modules/push/infrastructure/push-subscriptions.supabase', () => ({ advanceUserPushCursor }))
vi.mock('@/src/modules/portal/application/load-client-portal-notifications', () => ({ loadClientPortalNotifications: vi.fn() }))
vi.mock('@/src/modules/colaboradores/application/get-allowed-sections-for-worker', () => ({ getAllowedSectionsForWorker: vi.fn() }))
vi.mock('@/src/modules/colaboradores/application/mask-dashboard-for-worker', () => ({ filterNotificationsForWorker: vi.fn(), maskStatsForWorker: vi.fn() }))
vi.mock('@/src/modules/portal/infrastructure/chatter-read-state.supabase', () => ({ fetchChatterReadStateForUser: vi.fn(), upsertChatterReadState: vi.fn() }))
vi.mock('@/src/modules/portal/infrastructure/portal-record-watch-state.supabase', () => ({ fetchWatchStateForUser: vi.fn(), upsertWatchStateBatch: vi.fn() }))
vi.mock('@/src/modules/portal/infrastructure/resolve-watchable-ack-state', () => ({ resolveWatchableAckStateFromSnapshots: vi.fn() }))
vi.mock('@/src/modules/portal/infrastructure/portal-record-access', () => ({ verifyClientRecordAccess: vi.fn() }))

import { acknowledgeEventsSeenInAppAction, checkPortalNewsSignalAction } from '@/src/modules/portal/application/portal-chatter-notifications-actions'

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
  fetchPortalNewsSignalContext.mockResolvedValue(null)
  fetchPortalSessionContext.mockResolvedValue(null)
})

afterEach(() => {
  for (const [key, value] of [['PORTAL_NEWS_SIGNAL', ENV.signal], ['PORTAL_NEWS_FULL_CHECK_MAX_AGE_MS', ENV.max]] as const) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

describe('checkPortalNewsSignalAction — tipos de evento', () => {
  it('sin afterSeq no consulta los tipos', async () => {
    const result = await checkPortalNewsSignalAction()
    expect(result).not.toHaveProperty('eventKinds')
    expect(listPortalEventKindsAfter).not.toHaveBeenCalled()
  })

  it('con afterSeq y novedades (seq > afterSeq) devuelve los tipos de ese cliente', async () => {
    listPortalEventKindsAfter.mockResolvedValue({ kinds: ['message'], truncated: false })
    const result = await checkPortalNewsSignalAction({ afterSeq: 40 })
    expect(listPortalEventKindsAfter).toHaveBeenCalledWith(1233, 40)
    expect(result).toMatchObject({ ok: true, mode: 'events', seq: 42, eventKinds: { kinds: ['message'], truncated: false } })
  })

  it('sin novedades (seq <= afterSeq) o con afterSeq inválido no consulta', async () => {
    for (const afterSeq of [42, 50, -1, 1.5, Number.NaN]) {
      const result = await checkPortalNewsSignalAction({ afterSeq })
      expect(result).not.toHaveProperty('eventKinds')
    }
    expect(listPortalEventKindsAfter).not.toHaveBeenCalled()
  })

  it('si la consulta de tipos falla, responde igualmente con el seq (el cliente hará la completa)', async () => {
    listPortalEventKindsAfter.mockRejectedValue(new Error('boom'))
    const result = await checkPortalNewsSignalAction({ afterSeq: 1 })
    expect(result).toEqual({ ok: true, mode: 'events', seq: 42, fullCheckMaxAgeMs: 300_000 })
  })
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

  it('con la función SQL disponible usa su actor, cliente y seq sin más consultas', async () => {
    fetchPortalNewsSignalContext.mockResolvedValue({ actorId: 'actor-rpc', partnerId: 555, seq: 77 })

    expect(await checkPortalNewsSignalAction()).toMatchObject({ ok: true, mode: 'events', seq: 77 })

    expect(resolveDirectoryActorId).not.toHaveBeenCalled()
    expect(resolveClientOdooPartnerId).not.toHaveBeenCalled()
    expect(getMaxPortalEventSeqForPartner).not.toHaveBeenCalled()
  })

  it('con la función SQL y seq 0 (cliente sin eventos) devuelve 0 y no vuelve a preguntar', async () => {
    fetchPortalNewsSignalContext.mockResolvedValue({ actorId: 'a', partnerId: 555, seq: 0 })

    expect(await checkPortalNewsSignalAction()).toMatchObject({ seq: 0 })
    expect(getMaxPortalEventSeqForPartner).not.toHaveBeenCalled()
  })

  it('con la función SQL y sin cliente enlazado responde not_linked', async () => {
    fetchPortalNewsSignalContext.mockResolvedValue({ actorId: 'a', partnerId: null, seq: 0 })

    expect(await checkPortalNewsSignalAction()).toEqual({ ok: false, error: 'not_linked' })
    expect(resolveClientOdooPartnerId).not.toHaveBeenCalled()
  })

  it('si la señal SQL no está pero sí el contexto, usa el contexto y pide el seq aparte', async () => {
    fetchPortalSessionContext.mockResolvedValue({ actorId: 'actor-ctx', partnerId: 888 })

    expect(await checkPortalNewsSignalAction()).toMatchObject({ seq: 42 })

    expect(resolveDirectoryActorId).not.toHaveBeenCalled()
    expect(getMaxPortalEventSeqForPartner).toHaveBeenCalledWith(888)
  })

  it('sin función SQL usa el camino anterior', async () => {
    await checkPortalNewsSignalAction()

    expect(resolveDirectoryActorId).toHaveBeenCalledTimes(1)
    expect(resolveClientOdooPartnerId).toHaveBeenCalledWith(expect.anything(), 'actor-1')
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

describe('acknowledgeEventsSeenInAppAction', () => {
  it('avanza el cursor del push del usuario hasta el evento que ya vio', async () => {
    expect(await acknowledgeEventsSeenInAppAction(40)).toEqual({ ok: true })
    expect(advanceUserPushCursor).toHaveBeenCalledWith('actor-1', 40)
  })

  it('nunca pasa del último evento del cliente: el navegador no puede adelantar el cursor y silenciar avisos futuros', async () => {
    expect(await acknowledgeEventsSeenInAppAction(999_999)).toEqual({ ok: true })
    expect(advanceUserPushCursor).toHaveBeenCalledWith('actor-1', 42)
  })

  it.each([[0], [-3], [1.5], ['40'], [null], [undefined], [Number.NaN], [Number.POSITIVE_INFINITY]])(
    'rechaza un seq que no es un entero positivo (%s) sin tocar sesión ni base',
    async (seq) => {
      expect(await acknowledgeEventsSeenInAppAction(seq)).toEqual({ ok: false, error: 'invalid' })
      expect(getSession).not.toHaveBeenCalled()
      expect(advanceUserPushCursor).not.toHaveBeenCalled()
    }
  )

  it('solo para clientes y colaboradores con Odoo vinculado', async () => {
    getSession.mockResolvedValue({ user: { id: 'a', email: 'a@b.c', name: 'A', role: 'advisor' }, expiresAt: Date.now() + 1e5 })
    expect(await acknowledgeEventsSeenInAppAction(10)).toEqual({ ok: false, error: 'forbidden' })
    expect(advanceUserPushCursor).not.toHaveBeenCalled()
  })

  it('un cliente sin eventos no toca ningún cursor', async () => {
    getMaxPortalEventSeqForPartner.mockResolvedValue(0)
    expect(await acknowledgeEventsSeenInAppAction(10)).toEqual({ ok: true })
    expect(advanceUserPushCursor).not.toHaveBeenCalled()
  })

  it('un fallo de base de datos se responde como no disponible, sin lanzar', async () => {
    advanceUserPushCursor.mockRejectedValue(new Error('boom'))
    expect(await acknowledgeEventsSeenInAppAction(10)).toEqual({ ok: false, error: 'unavailable' })
  })
})

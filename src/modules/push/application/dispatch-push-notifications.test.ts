import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  runPushDispatch,
  runEventPushDispatch,
  acquirePushDispatchLock,
  releasePushDispatchLock,
  getAllowedSectionsForWorker,
  advancePushCursors,
  fetchPartnerIdsByUserIds,
  getMaxPortalEventSeq,
  listMaturePortalEvents,
  listPushSubscriptionsForPartner,
  savePushFailureCount,
  sendWebPush,
} = vi.hoisted(() => ({
  runPushDispatch: vi.fn(),
  runEventPushDispatch: vi.fn(),
  acquirePushDispatchLock: vi.fn(),
  releasePushDispatchLock: vi.fn(),
  getAllowedSectionsForWorker: vi.fn(),
  advancePushCursors: vi.fn(),
  fetchPartnerIdsByUserIds: vi.fn(),
  getMaxPortalEventSeq: vi.fn(),
  listMaturePortalEvents: vi.fn(),
  listPushSubscriptionsForPartner: vi.fn(),
  savePushFailureCount: vi.fn(),
  sendWebPush: vi.fn(),
}))

vi.mock('@/src/modules/push/application/run-push-dispatch', () => ({ runPushDispatch }))
vi.mock('@/src/modules/push/application/run-event-push-dispatch', () => ({
  runEventPushDispatch,
}))
vi.mock('@/src/modules/push/infrastructure/portal-events.supabase', () => ({
  getMaxPortalEventSeq,
  listMaturePortalEvents,
}))
vi.mock('@/src/modules/push/infrastructure/push-subscriptions.supabase', () => ({
  acquirePushDispatchLock,
  releasePushDispatchLock,
  advancePushCursors,
  deletePushSubscriptionsByIds: vi.fn(),
  fetchPartnerIdsByUserIds,
  fetchPushRecipients: vi.fn(),
  listPushSubscriptions: vi.fn(),
  listPushSubscriptionsForPartner,
  savePushDispatchState: vi.fn(),
  savePushFailureCount,
}))
vi.mock('@/src/modules/push/infrastructure/odoo-message-preview', () => ({
  fetchMessagePreview: vi.fn(),
}))
vi.mock('@/src/modules/push/infrastructure/web-push-sender', () => ({ sendWebPush }))
vi.mock('@/src/modules/portal/application/load-client-portal-notifications', () => ({
  loadClientPortalNotifications: vi.fn(),
}))
vi.mock('@/src/modules/portal/infrastructure/cached-client-odoo-access', () => ({
  getCachedClientOdooPartnerId: vi.fn(),
}))
vi.mock('@/src/modules/colaboradores/application/get-allowed-sections-for-worker', () => ({
  getAllowedSectionsForWorker,
}))
vi.mock('@/src/modules/colaboradores/application/mask-dashboard-for-worker', () => ({
  filterNotificationsForWorker: vi.fn(),
}))

import {
  dispatchPushEvents,
  dispatchPushNotifications,
} from '@/src/modules/push/application/dispatch-push-notifications'

beforeEach(() => {
  vi.resetAllMocks()
  runPushDispatch.mockResolvedValue({})
  runEventPushDispatch.mockResolvedValue({})
})

describe('dispatchPushNotifications', () => {
  it('da 45 s de trabajo a la ejecución', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_000_000)
    await dispatchPushNotifications()

    expect(runPushDispatch).toHaveBeenCalledWith(expect.anything(), {
      deadlineAt: 1_000_000 + 45_000,
    })
  })

  it('el cerrojo dura más que el trabajo y que maxDuration (60 s)', async () => {
    await dispatchPushNotifications()
    const deps = runPushDispatch.mock.calls[0]![0]

    acquirePushDispatchLock.mockResolvedValue(true)
    await deps.acquireLock()
    const ttl = acquirePushDispatchLock.mock.calls[0]![0] as number

    expect(ttl).toBeGreaterThan(60)
  })

  it('suelta el cerrojo con la función de infraestructura', async () => {
    await dispatchPushNotifications()
    const deps = runPushDispatch.mock.calls[0]![0]

    expect(deps.releaseLock).toBe(releasePushDispatchLock)
  })
})

describe('dispatchPushEvents', () => {
  async function eventDeps() {
    await dispatchPushEvents()
    return runEventPushDispatch.mock.calls[0]![0]
  }

  it('da 45 s de trabajo, igual que el cálculo anterior', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(2_000_000)
    await dispatchPushEvents()

    expect(runEventPushDispatch).toHaveBeenCalledWith(expect.anything(), {
      deadlineAt: 2_000_000 + 45_000,
    })
    expect(runPushDispatch).not.toHaveBeenCalled()
  })

  it('pasa el cliente del evento al ejecutor solo si se indica', async () => {
    await dispatchPushEvents({ partnerId: 1233 })
    expect(runEventPushDispatch.mock.calls[0]![1]).toMatchObject({ partnerId: 1233 })

    runEventPushDispatch.mockClear()
    await dispatchPushEvents()
    expect(runEventPushDispatch.mock.calls[0]![1]).not.toHaveProperty('partnerId')
  })

  it('usa el mismo cerrojo que el cálculo anterior (nunca dos a la vez)', async () => {
    const deps = await eventDeps()
    acquirePushDispatchLock.mockResolvedValue(true)
    await deps.acquireLock()

    expect(acquirePushDispatchLock.mock.calls[0]![0]).toBeGreaterThan(60)
    expect(deps.releaseLock).toBe(releasePushDispatchLock)
  })

  it('lee eventos, clientes y cursores de la infraestructura', async () => {
    const deps = await eventDeps()

    expect(deps.listMatureEvents).toBe(listMaturePortalEvents)
    expect(deps.getMaxEventSeq).toBe(getMaxPortalEventSeq)
    expect(deps.fetchPartnerIds).toBe(fetchPartnerIdsByUserIds)
    expect(deps.listSubscriptionsForPartner).toBe(listPushSubscriptionsForPartner)
    expect(deps.advanceCursors).toBe(advancePushCursors)
    expect(deps.saveFailureCount).toBe(savePushFailureCount)
  })

  it('envía con web-push', async () => {
    const deps = await eventDeps()
    sendWebPush.mockResolvedValue('ok')

    expect(await deps.send({ id: 's' }, { title: 't' })).toBe('ok')
    expect(sendWebPush).toHaveBeenCalledWith({ id: 's' }, { title: 't' })
  })

  it('las secciones de un colaborador salen de su usuario de portal', async () => {
    const deps = await eventDeps()
    const sections = new Set(['/tramites'])
    getAllowedSectionsForWorker.mockResolvedValue(sections)

    const result = await deps.loadAllowedSections({
      id: 'u1',
      email: 'w@x.y',
      role: 'worker',
      authUserId: 'auth-1',
      status: 'active',
      isActive: true,
    })

    expect(result).toBe(sections)
    expect(getAllowedSectionsForWorker).toHaveBeenCalledWith({
      id: 'auth-1',
      email: 'w@x.y',
      name: '',
      role: 'worker',
    })
  })

  it('sin usuario de autenticación no hay secciones (se salta y se reintenta)', async () => {
    const deps = await eventDeps()
    const result = await deps.loadAllowedSections({
      id: 'u1',
      email: 'w@x.y',
      role: 'worker',
      authUserId: null,
      status: 'active',
      isActive: true,
    })

    expect(result).toBeNull()
    expect(getAllowedSectionsForWorker).not.toHaveBeenCalled()
  })

  it('el orden de proceso es una permutación de los mismos elementos', async () => {
    const deps = await eventDeps()
    const items = [1, 2, 3, 4, 5, 6]

    expect([...deps.order(items)].sort()).toEqual(items)
    expect(items).toEqual([1, 2, 3, 4, 5, 6])
  })
})

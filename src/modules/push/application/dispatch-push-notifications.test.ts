import { beforeEach, describe, expect, it, vi } from 'vitest'

const { runPushDispatch, acquirePushDispatchLock, releasePushDispatchLock } = vi.hoisted(() => ({
  runPushDispatch: vi.fn(),
  acquirePushDispatchLock: vi.fn(),
  releasePushDispatchLock: vi.fn(),
}))

vi.mock('@/src/modules/push/application/run-push-dispatch', () => ({ runPushDispatch }))
vi.mock('@/src/modules/push/infrastructure/push-subscriptions.supabase', () => ({
  acquirePushDispatchLock,
  releasePushDispatchLock,
  deletePushSubscriptionsByIds: vi.fn(),
  fetchPushRecipients: vi.fn(),
  listPushSubscriptions: vi.fn(),
  savePushDispatchState: vi.fn(),
  savePushFailureCount: vi.fn(),
}))
vi.mock('@/src/modules/push/infrastructure/odoo-message-preview', () => ({
  fetchMessagePreview: vi.fn(),
}))
vi.mock('@/src/modules/push/infrastructure/web-push-sender', () => ({ sendWebPush: vi.fn() }))
vi.mock('@/src/modules/portal/application/load-client-portal-notifications', () => ({
  loadClientPortalNotifications: vi.fn(),
}))
vi.mock('@/src/modules/portal/infrastructure/cached-client-odoo-access', () => ({
  getCachedClientOdooPartnerId: vi.fn(),
}))
vi.mock('@/src/modules/colaboradores/application/get-allowed-sections-for-worker', () => ({
  getAllowedSectionsForWorker: vi.fn(),
}))
vi.mock('@/src/modules/colaboradores/application/mask-dashboard-for-worker', () => ({
  filterNotificationsForWorker: vi.fn(),
}))

import { dispatchPushNotifications } from '@/src/modules/push/application/dispatch-push-notifications'

beforeEach(() => {
  vi.resetAllMocks()
  runPushDispatch.mockResolvedValue({})
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

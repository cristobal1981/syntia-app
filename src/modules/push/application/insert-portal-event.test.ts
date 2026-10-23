import { beforeEach, describe, expect, it, vi } from 'vitest'

const { insertPortalEvent, invalidatePortalCachesForEvent } = vi.hoisted(() => ({
  insertPortalEvent: vi.fn(),
  invalidatePortalCachesForEvent: vi.fn(),
}))
vi.mock('@/src/modules/push/infrastructure/portal-events.supabase', () => ({ insertPortalEvent }))
vi.mock('@/src/modules/portal/infrastructure/portal-cache-invalidation', () => ({
  invalidatePortalCachesForEvent,
}))

import { insertPortalEventAndInvalidate } from '@/src/modules/push/application/insert-portal-event'
import type { PortalEventInput } from '@/src/modules/push/domain/portal-event'

const event: PortalEventInput = {
  eventId: 'task-state:9:2',
  partnerId: 5,
  kind: 'status',
  scope: 'tramite',
  recordId: 9,
  recordName: 'IRPF',
  stateLabel: 'Hecho',
  previousStateLabel: null,
  messageId: null,
  excerpt: null,
  byClient: false,
  occurredAt: '2026-10-23T10:00:00.000Z',
}

beforeEach(() => vi.resetAllMocks())

describe('insertPortalEventAndInvalidate', () => {
  it('un evento nuevo guarda y deja viejas las cachés del cliente', async () => {
    insertPortalEvent.mockResolvedValue('created')
    expect(await insertPortalEventAndInvalidate(event)).toBe('created')
    expect(invalidatePortalCachesForEvent).toHaveBeenCalledWith(event)
  })

  it('un reintento de Odoo (duplicado) no invalida otra vez', async () => {
    insertPortalEvent.mockResolvedValue('duplicate')
    expect(await insertPortalEventAndInvalidate(event)).toBe('duplicate')
    expect(invalidatePortalCachesForEvent).not.toHaveBeenCalled()
  })

  it('si no se puede guardar, el error sube y no se invalida nada', async () => {
    insertPortalEvent.mockRejectedValue(new Error('bd'))
    await expect(insertPortalEventAndInvalidate(event)).rejects.toThrow('bd')
    expect(invalidatePortalCachesForEvent).not.toHaveBeenCalled()
  })
})

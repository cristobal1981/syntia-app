import { describe, expect, it } from 'vitest'

import { obligaciones } from '@/content/obligaciones'
import { tramites } from '@/content/tramites'
import type { PendingSignatureRequest } from '@/src/modules/firmas/domain/types'
import {
  computeFirmaWatchDeltas,
  computeRecordWatchDeltas,
  mergeAccumulatedPortalNotifications,
  mergeAndSortPortalNotifications,
  notificationMatchesTramiteRecord,
  portalNotificationFromTramiteListItem,
  portalNotificationKey,
  pruneResolvedFirmaNotifications,
  removeNotificationFromList,
  removePortalNotificationsByRecord,
  removePortalNotificationsByScope,
  watchableFromTramiteListItem,
  type PortalWatchableRecord,
} from '@/src/modules/portal/domain/compute-portal-notifications'
import type { PortalNotification } from '@/src/modules/portal/domain/portal-notifications-types'
import type { PortalRecordWatchStateEntry } from '@/src/modules/portal/infrastructure/portal-record-watch-state.supabase'
import type { TramiteListItem } from '@/src/modules/tramites/domain/merge-tramites-list'

function record(overrides: Partial<PortalWatchableRecord>): PortalWatchableRecord {
  return {
    scope: 'tramite',
    recordId: 1,
    name: 'Trámite 1',
    state: '01_in_progress',
    isClosed: false,
    attachmentCount: 0,
    modifiedAt: '2026-01-10 10:00:00',
    ...overrides,
  }
}

function entry(overrides: Partial<PortalRecordWatchStateEntry>): PortalRecordWatchStateEntry {
  return {
    lastState: '01_in_progress',
    lastIsClosed: false,
    lastAttachmentCount: 0,
    firmaDueSoonNotified: false,
    initialized: true,
    ...overrides,
  }
}

describe('watchableFromTramiteListItem', () => {
  it('maps a TramiteListItem into a PortalWatchableRecord 1:1', () => {
    const item: TramiteListItem = {
      id: 7,
      name: 'Consulta X',
      kind: 'consulta',
      state: 'open',
      isClosed: false,
      attachmentCount: 2,
      modifiedAt: '2026-01-01 00:00:00',
      assignedNotifyPartnerIds: [],
      createdAt: '',
      priority: 0,
      assignees: [],
    }
    expect(watchableFromTramiteListItem(item)).toEqual({
      scope: 'consulta',
      recordId: 7,
      name: 'Consulta X',
      state: 'open',
      isClosed: false,
      attachmentCount: 2,
      modifiedAt: '2026-01-01 00:00:00',
      assigneeKey: '',
    })
  })

  it('lleva la huella y el texto de quién lo lleva, con la huella ordenada y sin repetidos', () => {
    const item: TramiteListItem = {
      id: 7,
      name: 'Trámite X',
      kind: 'tramite',
      isClosed: false,
      attachmentCount: 0,
      modifiedAt: '2026-01-01',
      assignedNotifyPartnerIds: [],
      createdAt: '',
      priority: 0,
      assignees: [
        { userId: 9, name: 'Luis' },
        { userId: 3, name: 'Ana' },
        { userId: 9, name: 'Luis' },
      ],
    }
    expect(watchableFromTramiteListItem(item)).toMatchObject({
      assigneeKey: '3,9',
      assigneeLabel: 'Luis, Ana y 1 más',
    })
  })
})

describe('computeRecordWatchDeltas', () => {
  it('a brand-new record (no previous watch state) is baselined without any notification', () => {
    const result = computeRecordWatchDeltas({
      records: [record({})],
      watchState: new Map(),
      portalBaselineComplete: true,
    })
    expect(result.notifications).toHaveLength(0)
    expect(result.watchUpdates).toEqual([
      {
        scope: 'tramite',
        recordId: 1,
        lastState: '01_in_progress',
        lastIsClosed: false,
        lastAttachmentCount: 0,
        firmaDueSoonNotified: false,
        initialized: true,
      },
    ])
  })

  it('a record that was closed and stays closed does not notify', () => {
    const watchState = new Map([
      ['tramite:1', entry({ lastIsClosed: true, lastState: '1_done' })],
    ])
    const result = computeRecordWatchDeltas({
      records: [record({ isClosed: true, state: '1_done' })],
      watchState,
      portalBaselineComplete: true,
    })
    expect(result.notifications).toHaveLength(0)
  })

  it('notifies a close event (status_change, isCloseEvent) when an open record transitions to closed', () => {
    const watchState = new Map([
      ['tramite:1', entry({ lastIsClosed: false, lastState: '01_in_progress' })],
    ])
    const result = computeRecordWatchDeltas({
      records: [record({ isClosed: true, state: '1_done' })],
      watchState,
      portalBaselineComplete: true,
    })
    expect(result.notifications).toHaveLength(1)
    expect(result.notifications[0]).toMatchObject({
      reason: 'status_change',
      isCloseEvent: true,
      previousStateLabel: tramites.taskStates.inProgress,
      newStateLabel: tramites.taskStates.done,
      recordKind: 'task',
      listKind: 'tramite',
    })
  })

  it('omits recordKind/listKind on a close-event notification for an obligacion (scope has no recordKind mapping)', () => {
    const watchState = new Map([
      ['obligacion:1', entry({ lastIsClosed: false, lastState: '01_in_progress' })],
    ])
    const result = computeRecordWatchDeltas({
      records: [record({ scope: 'obligacion', isClosed: true, state: '1_done' })],
      watchState,
      portalBaselineComplete: true,
    })
    expect(result.notifications[0].recordKind).toBeUndefined()
    expect(result.notifications[0].listKind).toBeUndefined()
  })

  it('on a close event, the watch-state upsert deliberately keeps the OLD lastState/lastIsClosed (not yet consumed) instead of advancing to the closed state', () => {
    const watchState = new Map([
      ['tramite:1', entry({ lastIsClosed: false, lastState: '01_in_progress' })],
    ])
    const result = computeRecordWatchDeltas({
      records: [record({ isClosed: true, state: '1_done' })],
      watchState,
      portalBaselineComplete: true,
    })
    expect(result.watchUpdates[0].lastState).toBe('01_in_progress')
    expect(result.watchUpdates[0].lastIsClosed).toBe(false)
  })

  it('notifies a plain status_change (not a close event) when an open record changes state without closing', () => {
    const watchState = new Map([
      ['tramite:1', entry({ lastIsClosed: false, lastState: '01_in_progress' })],
    ])
    const result = computeRecordWatchDeltas({
      records: [record({ isClosed: false, state: '02_changes_requested' })],
      watchState,
      portalBaselineComplete: true,
    })
    expect(result.notifications).toHaveLength(1)
    expect(result.notifications[0]).toMatchObject({
      reason: 'status_change',
      previousStateLabel: tramites.taskStates.inProgress,
      newStateLabel: tramites.taskStates.changesRequested,
    })
    expect(result.notifications[0].isCloseEvent).toBeUndefined()
  })

  it('for a consulta, the plain status_change previousStateLabel is always "en curso" (only reachable with a legacy watch row whose lastState is not open/closed)', () => {
    // El estado de una consulta se deriva solo de isClosed ('open'/'closed'),
    // así que esta rama solo se alcanza con filas antiguas de seguimiento.
    const watchState = new Map([
      ['consulta:1', entry({ lastIsClosed: false, lastState: '' })],
    ])
    const result = computeRecordWatchDeltas({
      records: [record({ scope: 'consulta', isClosed: false, state: 'in_progress' })],
      watchState,
      portalBaselineComplete: true,
    })
    expect(result.notifications[0].previousStateLabel).toBe(tramites.taskStates.inProgress)
  })

  it('for an obligacion, status_change labels use the obligacion-specific vocabulary', () => {
    const watchState = new Map([
      ['obligacion:1', entry({ lastIsClosed: false, lastState: '01_in_progress' })],
    ])
    const result = computeRecordWatchDeltas({
      records: [record({ scope: 'obligacion', isClosed: false, state: '02_changes_requested' })],
      watchState,
      portalBaselineComplete: true,
    })
    expect(result.notifications[0].previousStateLabel).toBe(obligaciones.taskStates.inProgress)
    expect(result.notifications[0].newStateLabel).toBe(obligaciones.taskStates.changesRequested)
  })

  it('does NOT notify when attachmentCount increases: los documentos llegan con el mensaje del chatter o con el cambio de estado', () => {
    const watchState = new Map([
      ['tramite:1', entry({ lastIsClosed: false, lastState: '01_in_progress', lastAttachmentCount: 1 })],
    ])
    const result = computeRecordWatchDeltas({
      records: [record({ isClosed: false, state: '01_in_progress', attachmentCount: 2 })],
      watchState,
      portalBaselineComplete: true,
    })
    expect(result.notifications).toEqual([])
  })

  it('when attachmentCount increases, the upsert follows the new count (nothing pending to consume)', () => {
    const watchState = new Map([
      ['tramite:1', entry({ lastIsClosed: false, lastState: '01_in_progress', lastAttachmentCount: 1 })],
    ])
    const result = computeRecordWatchDeltas({
      records: [record({ isClosed: false, state: '01_in_progress', attachmentCount: 2 })],
      watchState,
      portalBaselineComplete: true,
    })
    expect(result.watchUpdates[0].lastAttachmentCount).toBe(2)
  })

  it('a state change with more documents at once notifies only the status_change', () => {
    const watchState = new Map([
      ['tramite:1', entry({ lastIsClosed: false, lastState: '01_in_progress', lastAttachmentCount: 1 })],
    ])
    const result = computeRecordWatchDeltas({
      records: [
        record({ isClosed: false, state: '02_changes_requested', attachmentCount: 2 }),
      ],
      watchState,
      portalBaselineComplete: true,
    })
    expect(result.notifications.map((n) => n.reason)).toEqual(['status_change'])
  })

  it('does not notify and advances the upsert to fresh values when nothing changed', () => {
    const watchState = new Map([
      ['tramite:1', entry({ lastIsClosed: false, lastState: '01_in_progress', lastAttachmentCount: 2 })],
    ])
    const result = computeRecordWatchDeltas({
      records: [record({ isClosed: false, state: '01_in_progress', attachmentCount: 2 })],
      watchState,
      portalBaselineComplete: true,
    })
    expect(result.notifications).toHaveLength(0)
    expect(result.watchUpdates[0]).toMatchObject({
      lastState: '01_in_progress',
      lastIsClosed: false,
      lastAttachmentCount: 2,
    })
  })
})

describe('computeRecordWatchDeltas: cambio de responsable', () => {
  const watch = (lastAssigneeKey: string | undefined) =>
    new Map([['tramite:1', entry({ lastAssigneeKey })]])
  const run = (overrides: Partial<PortalWatchableRecord>, lastAssigneeKey: string | undefined) =>
    computeRecordWatchDeltas({
      records: [record({ assigneeKey: '8', assigneeLabel: 'Bruno Díaz', ...overrides })],
      watchState: watch(lastAssigneeKey),
      portalBaselineComplete: true,
    })

  it('avisa cuando lo lleva otra persona, con su nombre, y conserva la huella vieja hasta confirmar', () => {
    const result = run({}, '7')
    expect(result.notifications).toHaveLength(1)
    expect(result.notifications[0]).toMatchObject({
      reason: 'assignee_change',
      scope: 'tramite',
      recordId: 1,
      assigneeLabel: 'Bruno Díaz',
      recordKind: 'task',
      listKind: 'tramite',
    })
    expect(result.watchUpdates[0]!.lastAssigneeKey).toBe('7')
  })

  it('una consulta también avisa, con su tipo de registro', () => {
    const result = computeRecordWatchDeltas({
      records: [record({ scope: 'consulta', state: undefined, assigneeKey: '8', assigneeLabel: 'Bruno' })],
      watchState: new Map([['consulta:1', entry({ lastState: 'open', lastAssigneeKey: '7' })]]),
      portalBaselineComplete: true,
    })
    expect(result.notifications[0]).toMatchObject({ reason: 'assignee_change', recordKind: 'ticket', listKind: 'consulta' })
  })

  it('misma huella: no avisa y el seguimiento sigue igual', () => {
    const result = run({}, '8')
    expect(result.notifications).toEqual([])
    expect(result.watchUpdates[0]!.lastAssigneeKey).toBe('8')
  })

  it('una fila anterior a la columna (sin huella) se rellena sin avisar', () => {
    const result = run({}, undefined)
    expect(result.notifications).toEqual([])
    expect(result.watchUpdates[0]!.lastAssigneeKey).toBe('8')
  })

  it('si se quitó la asignación (nadie) no avisa, y el seguimiento pasa a «nadie»', () => {
    const result = run({ assigneeKey: '', assigneeLabel: undefined }, '7')
    expect(result.notifications).toEqual([])
    expect(result.watchUpdates[0]!.lastAssigneeKey).toBe('')
  })

  it('pasar de nadie a alguien sí avisa', () => {
    expect(run({}, '').notifications).toHaveLength(1)
  })

  it('un registro cerrado no avisa de responsables', () => {
    expect(run({ isClosed: true }, '7').notifications.filter((n) => n.reason === 'assignee_change')).toEqual([])
  })

  it('las obligaciones (sin huella) no avisan', () => {
    const result = computeRecordWatchDeltas({
      records: [record({ scope: 'obligacion', assigneeKey: undefined })],
      watchState: new Map([['obligacion:1', entry({ lastAssigneeKey: '7' })]]),
      portalBaselineComplete: true,
    })
    expect(result.notifications).toEqual([])
  })

  it('cambia el responsable y el estado a la vez: salen los dos avisos', () => {
    const result = run({ state: '02_changes_requested' }, '7')
    expect(result.notifications.map((n) => n.reason).sort()).toEqual(['assignee_change', 'status_change'])
  })

  it('la primera vez que se ve el registro, solo se toma la huella', () => {
    const result = computeRecordWatchDeltas({
      records: [record({ assigneeKey: '8', assigneeLabel: 'Bruno' })],
      watchState: new Map(),
      portalBaselineComplete: true,
    })
    expect(result.notifications).toEqual([])
    expect(result.watchUpdates[0]!.lastAssigneeKey).toBe('8')
  })
})

describe('computeFirmaWatchDeltas', () => {
  const futureDate = (days: number) =>
    new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()

  function firma(overrides: Partial<PendingSignatureRequest>): PendingSignatureRequest {
    return { id: 1, reference: 'FIRMA-1', signUrl: 'https://x', ...overrides }
  }

  it('does not notify a brand-new firma when the portal baseline has not completed yet', () => {
    const result = computeFirmaWatchDeltas({
      requests: [firma({ dueDate: futureDate(3) })],
      watchState: new Map(),
      portalBaselineComplete: false,
    })
    expect(result.notifications).toHaveLength(0)
  })

  it('notifies new_firma (and firma_due_soon if applicable) for a brand-new firma once the baseline is complete', () => {
    const result = computeFirmaWatchDeltas({
      requests: [firma({ dueDate: futureDate(3) })],
      watchState: new Map(),
      portalBaselineComplete: true,
    })
    const reasons = result.notifications.map((n) => n.reason).sort()
    expect(reasons).toEqual(['firma_due_soon', 'new_firma'])
  })

  it('does not notify firma_due_soon for a brand-new firma whose due date is not within the due-soon window', () => {
    const result = computeFirmaWatchDeltas({
      requests: [firma({ dueDate: futureDate(30) })],
      watchState: new Map(),
      portalBaselineComplete: true,
    })
    expect(result.notifications.map((n) => n.reason)).toEqual(['new_firma'])
  })

  it('notifies firma_due_soon for an already-tracked firma that newly enters the due-soon window', () => {
    const watchState = new Map([
      ['firma:1', entry({ firmaDueSoonNotified: false })],
    ])
    const result = computeFirmaWatchDeltas({
      requests: [firma({ dueDate: futureDate(3) })],
      watchState,
      portalBaselineComplete: true,
    })
    expect(result.notifications).toHaveLength(1)
    expect(result.notifications[0].reason).toBe('firma_due_soon')
    expect(result.watchUpdates[0].firmaDueSoonNotified).toBe(true)
  })

  it('does NOT re-notify firma_due_soon for a firma that is still due-soon but was already notified', () => {
    const watchState = new Map([
      ['firma:1', entry({ firmaDueSoonNotified: true })],
    ])
    const result = computeFirmaWatchDeltas({
      requests: [firma({ dueDate: futureDate(3) })],
      watchState,
      portalBaselineComplete: true,
    })
    expect(result.notifications).toHaveLength(0)
  })

  it('rearms firmaDueSoonNotified when the firma falls outside the due-soon window (plazo ampliado)', () => {
    const watchState = new Map([
      ['firma:1', entry({ firmaDueSoonNotified: true })],
    ])
    const result = computeFirmaWatchDeltas({
      requests: [firma({ dueDate: futureDate(30) })],
      watchState,
      portalBaselineComplete: true,
    })
    expect(result.notifications).toHaveLength(0)
    expect(result.watchUpdates[0].firmaDueSoonNotified).toBe(false)
  })

  it('notifies firma_due_soon again when a rearmed firma re-enters the due-soon window', () => {
    const outside = computeFirmaWatchDeltas({
      requests: [firma({ dueDate: futureDate(30) })],
      watchState: new Map([['firma:1', entry({ firmaDueSoonNotified: true })]]),
      portalBaselineComplete: true,
    })
    const rearmed = outside.watchUpdates[0]
    const again = computeFirmaWatchDeltas({
      requests: [firma({ dueDate: futureDate(3) })],
      watchState: new Map([['firma:1', entry({ ...rearmed })]]),
      portalBaselineComplete: true,
    })
    expect(again.notifications.map((n) => n.reason)).toEqual(['firma_due_soon'])
    expect(again.watchUpdates[0].firmaDueSoonNotified).toBe(true)
  })

  it('rearms firmaDueSoonNotified when the firma has no due date (no date means not due soon)', () => {
    const result = computeFirmaWatchDeltas({
      requests: [firma({ dueDate: undefined })],
      watchState: new Map([['firma:1', entry({ firmaDueSoonNotified: true })]]),
      portalBaselineComplete: true,
    })
    expect(result.watchUpdates[0].firmaDueSoonNotified).toBe(false)
  })
})

describe('mergeAndSortPortalNotifications', () => {
  function notif(overrides: Partial<PortalNotification>): PortalNotification {
    return {
      scope: 'tramite',
      recordId: 1,
      name: 'X',
      reason: 'new_tramite',
      latestDate: '2026-01-01 00:00:00',
      ...overrides,
    }
  }

  it('sorts merged notifications by latestDate descending', () => {
    const older = notif({ recordId: 1, reason: 'status_change', latestDate: '2026-01-01 00:00:00' })
    const newer = notif({ recordId: 2, reason: 'status_change', latestDate: '2026-02-01 00:00:00' })
    const result = mergeAndSortPortalNotifications([older], [newer])
    expect(result.map((n) => n.recordId)).toEqual([2, 1])
  })

  it('drops a "new_tramite" entry for a tramite that also has an "unread_chatter" entry (unread wins, no duplicate bell entry)', () => {
    const newTramite = notif({ recordId: 5, reason: 'new_tramite', listKind: 'tramite' })
    const unread = notif({ recordId: 5, reason: 'unread_chatter', listKind: 'tramite' })
    const result = mergeAndSortPortalNotifications([newTramite, unread])
    expect(result).toHaveLength(1)
    expect(result[0].reason).toBe('unread_chatter')
  })

  it('does NOT drop a "new_tramite" entry for a consulta even if it also has an unread_chatter entry (dedup is scoped to listKind "tramite")', () => {
    const newTramite = notif({ recordId: 5, reason: 'new_tramite', listKind: 'consulta' })
    const unread = notif({ recordId: 5, reason: 'unread_chatter', listKind: 'consulta' })
    const result = mergeAndSortPortalNotifications([newTramite, unread])
    expect(result).toHaveLength(2)
  })
})

describe('portalNotificationKey', () => {
  it('builds a scope:recordId:reason key', () => {
    const key = portalNotificationKey({
      scope: 'firma',
      recordId: 3,
      name: 'x',
      reason: 'firma_due_soon',
      latestDate: '2026-01-01',
    })
    expect(key).toBe('firma:3:firma_due_soon')
  })
})

describe('mergeAccumulatedPortalNotifications', () => {
  function notif(overrides: Partial<PortalNotification>): PortalNotification {
    return {
      scope: 'tramite',
      recordId: 1,
      name: 'X',
      reason: 'status_change',
      latestDate: '2026-01-01 00:00:00',
      ...overrides,
    }
  }

  it('drops a previously-accumulated "unread_chatter" snapshot entry when the new poll no longer reports it (it is read now)', () => {
    const existing = [notif({ reason: 'unread_chatter', recordId: 9 })]
    const result = mergeAccumulatedPortalNotifications(existing, [])
    expect(result).toHaveLength(0)
  })

  it('retains a non-snapshot reason (e.g. status_change) across polls even when the new poll reports nothing new', () => {
    const existing = [notif({ reason: 'status_change', recordId: 9 })]
    const result = mergeAccumulatedPortalNotifications(existing, [])
    expect(result).toHaveLength(1)
  })

  it('overwrites an existing entry with the incoming one when they share the same scope/recordId/reason key', () => {
    const existing = [notif({ reason: 'status_change', recordId: 9, latestDate: '2026-01-01 00:00:00' })]
    const incoming = [notif({ reason: 'status_change', recordId: 9, latestDate: '2026-03-01 00:00:00' })]
    const result = mergeAccumulatedPortalNotifications(existing, incoming)
    expect(result).toHaveLength(1)
    expect(result[0].latestDate).toBe('2026-03-01 00:00:00')
  })
})

describe('pruneResolvedFirmaNotifications', () => {
  function notif(overrides: Partial<PortalNotification>): PortalNotification {
    return {
      scope: 'firma',
      recordId: 1,
      name: 'X',
      reason: 'firma_due_soon',
      latestDate: '2026-01-01',
      ...overrides,
    }
  }

  it('returns the exact same array reference when there are no firma-scoped notifications (fast path)', () => {
    const items = [notif({ scope: 'tramite', reason: 'status_change' })]
    expect(pruneResolvedFirmaNotifications(items, [])).toBe(items)
  })

  it('drops a firma notification whose recordId is no longer pending', () => {
    const items = [notif({ recordId: 1 }), notif({ recordId: 2 })]
    const result = pruneResolvedFirmaNotifications(items, [2])
    expect(result.map((n) => n.recordId)).toEqual([2])
  })

  it('keeps non-firma notifications untouched regardless of the pending firma list', () => {
    const items = [notif({ scope: 'tramite', reason: 'status_change', recordId: 1 })]
    const result = pruneResolvedFirmaNotifications(items, [])
    expect(result).toHaveLength(1)
  })
})

describe('portalNotificationFromTramiteListItem', () => {
  function item(overrides: Partial<TramiteListItem>): TramiteListItem {
    return {
      id: 1,
      name: 'X',
      kind: 'tramite',
      isClosed: false,
      attachmentCount: 0,
      modifiedAt: '2026-01-01',
      assignedNotifyPartnerIds: [],
      createdAt: '',
      priority: 0,
      assignees: [],
      ...overrides,
    }
  }

  it('derives recordKind "task" and listKind "tramite" for a tramite item', () => {
    const result = portalNotificationFromTramiteListItem(item({ kind: 'tramite' }), 'new_tramite')
    expect(result.recordKind).toBe('task')
    expect(result.listKind).toBe('tramite')
  })

  it('derives recordKind "ticket" and listKind "consulta" for a consulta item', () => {
    const result = portalNotificationFromTramiteListItem(item({ kind: 'consulta' }), 'new_tramite')
    expect(result.recordKind).toBe('ticket')
    expect(result.listKind).toBe('consulta')
  })
})

describe('notificationMatchesTramiteRecord', () => {
  it('matches only when both recordKind and recordId match', () => {
    const n: PortalNotification = {
      scope: 'tramite',
      recordId: 5,
      name: 'x',
      reason: 'status_change',
      latestDate: '2026-01-01',
      recordKind: 'task',
    }
    expect(notificationMatchesTramiteRecord(n, 'task', 5)).toBe(true)
    expect(notificationMatchesTramiteRecord(n, 'ticket', 5)).toBe(false)
    expect(notificationMatchesTramiteRecord(n, 'task', 6)).toBe(false)
  })
})

describe('removePortalNotificationsByRecord', () => {
  function items(): PortalNotification[] {
    return [
      { scope: 'tramite', recordId: 5, name: 'x', reason: 'status_change', latestDate: 'd', recordKind: 'task' },
      { scope: 'tramite', recordId: 5, name: 'x', reason: 'unread_chatter', latestDate: 'd', recordKind: 'task' },
      { scope: 'consulta', recordId: 9, name: 'y', reason: 'status_change', latestDate: 'd', recordKind: 'ticket' },
    ]
  }

  it('without a reason, removes ALL notifications for that record', () => {
    const result = removePortalNotificationsByRecord(items(), 'task', 5)
    expect(result).toHaveLength(1)
    expect(result[0].recordId).toBe(9)
  })

  it('with a reason, removes only the matching reason for that record', () => {
    const result = removePortalNotificationsByRecord(items(), 'task', 5, 'status_change')
    expect(result.map((n) => n.reason)).toEqual(['unread_chatter', 'status_change'])
  })

  it('returns the exact same array reference when nothing matched (no-op)', () => {
    const input = items()
    expect(removePortalNotificationsByRecord(input, 'task', 999)).toBe(input)
  })
})

describe('removePortalNotificationsByScope', () => {
  it('matches by scope+recordId, independent of recordKind', () => {
    const items: PortalNotification[] = [
      { scope: 'obligacion', recordId: 3, name: 'x', reason: 'status_change', latestDate: 'd' },
      { scope: 'firma', recordId: 3, name: 'y', reason: 'firma_due_soon', latestDate: 'd' },
    ]
    const result = removePortalNotificationsByScope(items, 'obligacion', 3)
    expect(result).toHaveLength(1)
    expect(result[0].scope).toBe('firma')
  })
})

describe('removeNotificationFromList', () => {
  it('removes exactly the notification matching scope+recordId+reason, even for scopes with no recordKind (e.g. obligacion)', () => {
    const target: PortalNotification = {
      scope: 'obligacion',
      recordId: 4,
      name: 'Modelo 303',
      reason: 'status_change',
      latestDate: 'd',
    }
    const other: PortalNotification = { ...target, reason: 'new_tramite' }
    const result = removeNotificationFromList([target, other], target)
    expect(result).toEqual([other])
  })

  it('does not remove a notification with a different reason for the same record', () => {
    const target: PortalNotification = {
      scope: 'firma',
      recordId: 4,
      name: 'x',
      reason: 'firma_due_soon',
      latestDate: 'd',
    }
    const toRemove = { ...target, reason: 'new_firma' as const }
    expect(removeNotificationFromList([target], toRemove)).toEqual([target])
  })
})

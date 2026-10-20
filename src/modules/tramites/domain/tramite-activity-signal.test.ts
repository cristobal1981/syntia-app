import { describe, expect, it } from 'vitest'

import type { PortalNotification } from '@/src/modules/portal/domain/portal-notifications-types'
import type { TramiteListItem } from '@/src/modules/tramites/domain/merge-tramites-list'
import { sortTramiteListByActivity } from '@/src/modules/tramites/domain/tramite-activity-signal'

function item(id: number, over: Partial<TramiteListItem> = {}): TramiteListItem {
  return {
    id,
    name: `t${id}`,
    kind: 'tramite',
    isClosed: false,
    attachmentCount: 0,
    modifiedAt: `2026-10-${String(10 + id).padStart(2, '0')} 10:00:00`,
    assignedNotifyPartnerIds: [],
    ...over,
  }
}

const chatter = (recordId: number): PortalNotification =>
  ({
    scope: 'tramite',
    recordKind: 'task',
    recordId,
    name: `t${recordId}`,
    reason: 'unread_chatter',
    latestDate: '2026-10-30 10:00:00',
  }) as PortalNotification

const ids = (list: TramiteListItem[]) => list.map((i) => i.id)

describe('sortTramiteListByActivity', () => {
  it('«Cambios solicitados» va primero, por delante de los que tienen novedades', () => {
    const items = [
      item(1),
      item(2, { state: '01_in_progress' }),
      item(3, { state: '02_changes_requested' }),
      item(4),
    ]
    expect(ids(sortTramiteListByActivity(items, [chatter(2)]))).toEqual([3, 2, 1, 4])
  })

  it('entre varios con cambios solicitados, el más reciente primero', () => {
    const items = [
      item(1, { state: '02_changes_requested' }),
      item(5, { state: '02_changes_requested' }),
      item(3, { state: '02_changes_requested' }),
    ]
    expect(ids(sortTramiteListByActivity(items, []))).toEqual([5, 3, 1])
  })

  it('un trámite con cambios solicitados y novedades no se duplica', () => {
    const items = [item(1, { state: '02_changes_requested' }), item(2)]
    expect(ids(sortTramiteListByActivity(items, [chatter(1)]))).toEqual([1, 2])
  })

  it('una consulta nunca cuenta como cambios solicitados', () => {
    const items = [item(1), item(2, { kind: 'consulta', state: '02_changes_requested' })]
    expect(ids(sortTramiteListByActivity(items, []))).toEqual([1, 2])
  })
})

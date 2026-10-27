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
    createdAt: '',
    priority: 0,
    assignees: [],
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
  it('«Requiere tu atención» va primero, por delante de los que tienen novedades', () => {
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

  describe('prioridad', () => {
    it('sin novedades, las de prioridad más alta van primero y a igual prioridad se conserva el orden de llegada', () => {
      const items = [
        item(1, { priority: 0 }),
        item(2, { priority: 3 }),
        item(3, { priority: 1 }),
        item(4, { priority: 3 }),
      ]
      expect(ids(sortTramiteListByActivity(items, []))).toEqual([2, 4, 3, 1])
    })

    it('entre los que tienen novedades, primero la prioridad y a igual prioridad la novedad más reciente', () => {
      const items = [item(1, { priority: 0 }), item(2, { priority: 2 }), item(3, { priority: 2 })]
      const news = [chatter(1), chatter(2), { ...chatter(3), latestDate: '2026-10-31 10:00:00' }]
      expect(ids(sortTramiteListByActivity(items, news))).toEqual([3, 2, 1])
    })

    it('entre los que tienen novedades, una prioridad alta con novedad más vieja va antes que una baja con novedad más nueva', () => {
      const items = [item(1, { priority: 0 }), item(2, { priority: 3 })]
      const news = [
        { ...chatter(1), latestDate: '2026-11-05 10:00:00' },
        { ...chatter(2), latestDate: '2026-10-20 10:00:00' },
      ]
      expect(ids(sortTramiteListByActivity(items, news))).toEqual([2, 1])
    })

    it('entre los de «Requiere tu atención», primero la prioridad y luego el más reciente', () => {
      const items = [
        item(1, { state: '02_changes_requested', priority: 0 }),
        item(5, { state: '02_changes_requested', priority: 0 }),
        item(3, { state: '02_changes_requested', priority: 2 }),
      ]
      expect(ids(sortTramiteListByActivity(items, []))).toEqual([3, 5, 1])
    })

    it('la prioridad no salta de grupo: una urgente sin novedades va detrás de lo que requiere atención y de lo que tiene novedades', () => {
      const items = [
        item(1, { priority: 3 }),
        item(2, { priority: 0 }),
        item(3, { state: '02_changes_requested', priority: 0 }),
      ]
      expect(ids(sortTramiteListByActivity(items, [chatter(2)]))).toEqual([3, 2, 1])
    })

    it('las consultas se ordenan por prioridad igual que los trámites', () => {
      const items = [
        item(1, { kind: 'consulta', priority: 0 }),
        item(2, { kind: 'consulta', priority: 3 }),
        item(3, { priority: 1 }),
      ]
      expect(ids(sortTramiteListByActivity(items, []))).toEqual([2, 3, 1])
    })
  })
})

import { describe, expect, it } from 'vitest'

import {
  buildPushPayload,
  MAX_SENT_KEYS,
  pushCategoryForReason,
  pushKeyForNotification,
  pushUrlForNotification,
  selectNotificationsToPush,
} from '@/src/modules/push/domain/push-dispatch'
import type { PortalNotification } from '@/src/modules/portal/domain/portal-notifications-types'

function n(partial: Partial<PortalNotification>): PortalNotification {
  return {
    scope: 'tramite',
    recordId: 1,
    name: 'IRPF 2025',
    reason: 'unread_chatter',
    latestDate: '2026-10-20 10:00:00',
    listKind: 'tramite',
    latestMessageId: 10,
    ...partial,
  }
}

const all = { chatter: true, status: true, firmas: true }

describe('pushCategoryForReason', () => {
  it('agrupa los motivos en los tres tipos y descarta documentos', () => {
    expect(pushCategoryForReason('unread_chatter')).toBe('chatter')
    expect(pushCategoryForReason('new_tramite')).toBe('status')
    expect(pushCategoryForReason('status_change')).toBe('status')
    expect(pushCategoryForReason('new_firma')).toBe('firmas')
    expect(pushCategoryForReason('firma_due_soon')).toBe('firmas')
    expect(pushCategoryForReason('new_document')).toBeNull()
  })
})

describe('pushKeyForNotification', () => {
  it('cambia con un mensaje nuevo, no con la misma situación', () => {
    expect(pushKeyForNotification(n({}))).toBe(pushKeyForNotification(n({})))
    expect(pushKeyForNotification(n({ latestMessageId: 11 }))).not.toBe(
      pushKeyForNotification(n({}))
    )
  })

  it('sin id de mensaje usa la fecha', () => {
    const key = pushKeyForNotification(
      n({ reason: 'status_change', latestMessageId: undefined })
    )
    expect(key).toContain('2026-10-20 10:00:00')
  })
})

describe('selectNotificationsToPush', () => {
  it('sin foto inicial no manda nada y registra lo pendiente', () => {
    const result = selectNotificationsToPush({
      notifications: [n({})],
      preferences: all,
      sentKeys: [],
      baselined: false,
    })
    expect(result.toSend).toEqual([])
    expect(result.nextSentKeys).toEqual([pushKeyForNotification(n({}))])
  })

  it('manda lo nuevo y no repite lo ya enviado', () => {
    const old = n({ latestMessageId: 10 })
    const fresh = n({ latestMessageId: 11 })
    const result = selectNotificationsToPush({
      notifications: [old, fresh],
      preferences: all,
      sentKeys: [pushKeyForNotification(old)],
      baselined: true,
    })
    expect(result.toSend).toEqual([fresh])
    expect(result.nextSentKeys).toEqual([
      pushKeyForNotification(old),
      pushKeyForNotification(fresh),
    ])
  })

  it('respeta las preferencias por tipo', () => {
    const chatter = n({})
    const firma = n({ reason: 'new_firma', scope: 'firma', latestMessageId: undefined })
    const result = selectNotificationsToPush({
      notifications: [chatter, firma],
      preferences: { chatter: false, status: true, firmas: true },
      sentKeys: [],
      baselined: true,
    })
    expect(result.toSend).toEqual([firma])
  })

  it('un tipo apagado se marca como visto: al encenderlo no llega lo antiguo', () => {
    const chatter = n({})
    const off = selectNotificationsToPush({
      notifications: [chatter],
      preferences: { chatter: false, status: true, firmas: true },
      sentKeys: [],
      baselined: true,
    })
    expect(off.toSend).toEqual([])
    const on = selectNotificationsToPush({
      notifications: [chatter],
      preferences: all,
      sentKeys: off.nextSentKeys,
      baselined: true,
    })
    expect(on.toSend).toEqual([])
  })

  it('ignora los avisos de documentos', () => {
    const result = selectNotificationsToPush({
      notifications: [n({ reason: 'new_document' })],
      preferences: all,
      sentKeys: [],
      baselined: true,
    })
    expect(result.toSend).toEqual([])
    expect(result.nextSentKeys).toEqual([])
  })

  it('recorta las claves a las últimas MAX_SENT_KEYS', () => {
    const sentKeys = Array.from({ length: MAX_SENT_KEYS }, (_, i) => `old-${i}`)
    const fresh = n({ latestMessageId: 999 })
    const result = selectNotificationsToPush({
      notifications: [fresh],
      preferences: all,
      sentKeys,
      baselined: true,
    })
    expect(result.nextSentKeys).toHaveLength(MAX_SENT_KEYS)
    expect(result.nextSentKeys[0]).toBe('old-1')
    expect(result.nextSentKeys.at(-1)).toBe(pushKeyForNotification(fresh))
  })
})

describe('pushUrlForNotification', () => {
  it('lleva al mismo sitio que abrir el aviso dentro de la app', () => {
    expect(pushUrlForNotification(n({ scope: 'firma', listKind: undefined }))).toBe(
      '/firmas'
    )
    expect(
      pushUrlForNotification(n({ scope: 'obligacion', recordId: 7, listKind: undefined }))
    ).toBe('/obligaciones?open=task-7&tab=documents')
    expect(pushUrlForNotification(n({ recordId: 5 }))).toBe(
      '/tramites?open=tramite-5&tab=conversation'
    )
    expect(
      pushUrlForNotification(n({ scope: 'consulta', listKind: 'consulta', recordId: 9 }))
    ).toBe('/tramites?open=consulta-9&tab=conversation')
  })

  it('sin destino conocido cae al inicio', () => {
    expect(pushUrlForNotification(n({ listKind: undefined }))).toBe('/dashboard')
  })
})

describe('buildPushPayload', () => {
  it('sin avisos no hay payload', () => {
    expect(buildPushPayload([])).toBeNull()
  })

  it('un aviso: título por motivo, nombre del trámite y su ruta', () => {
    const payload = buildPushPayload([n({ recordId: 5 })])
    expect(payload).toEqual({
      title: 'Nuevo mensaje de tu asesoría',
      body: 'IRPF 2025',
      url: '/tramites?open=tramite-5&tab=conversation',
      tag: pushKeyForNotification(n({ recordId: 5 })),
    })
  })

  it('el título depende del motivo', () => {
    expect(buildPushPayload([n({ reason: 'status_change' })])?.title).toBe(
      'Novedad en tu trámite'
    )
    expect(buildPushPayload([n({ reason: 'new_tramite' })])?.title).toBe('Nuevo trámite')
    expect(
      buildPushPayload([n({ reason: 'new_firma', scope: 'firma' })])?.title
    ).toBe('Tienes una firma pendiente')
    expect(
      buildPushPayload([n({ reason: 'firma_due_soon', scope: 'firma' })])?.title
    ).toBe('Una firma está a punto de vencer')
  })

  it('varios avisos: resumen que lleva al inicio, con nombres sin repetir', () => {
    const payload = buildPushPayload([
      n({ recordId: 1, name: 'A' }),
      n({ recordId: 2, name: 'B' }),
      n({ recordId: 3, name: 'A', latestMessageId: 99 }),
    ])
    expect(payload).toEqual({
      title: 'Tienes 3 novedades en Syntia',
      body: 'A, B',
      url: '/dashboard',
      tag: 'syntia-summary',
    })
  })

  it('con más de tres nombres añade «y N más»', () => {
    const payload = buildPushPayload(
      ['A', 'B', 'C', 'D', 'E'].map((name, i) => n({ recordId: i, name }))
    )
    expect(payload?.body).toBe('A, B, C y 2 más')
  })
})

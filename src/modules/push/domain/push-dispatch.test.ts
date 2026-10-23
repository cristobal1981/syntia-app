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
  it('agrupa los motivos en los tres tipos', () => {
    expect(pushCategoryForReason('unread_chatter')).toBe('chatter')
    expect(pushCategoryForReason('new_tramite')).toBe('status')
    expect(pushCategoryForReason('status_change')).toBe('status')
    expect(pushCategoryForReason('new_firma')).toBe('firmas')
    expect(pushCategoryForReason('firma_due_soon')).toBe('firmas')
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

describe('buildPushPayload: cambio de responsable', () => {
  const change = (partial: Partial<PortalNotification> = {}) =>
    n({
      reason: 'assignee_change',
      name: 'Alta de autónomo',
      latestMessageId: undefined,
      assigneeLabel: 'Ana García',
      ...partial,
    })

  it('cuenta como aviso de estados: respeta esa preferencia del dispositivo', () => {
    expect(pushCategoryForReason('assignee_change')).toBe('status')
    const base = { notifications: [change()], sentKeys: [], baselined: true }
    expect(selectNotificationsToPush({ ...base, preferences: all }).toSend).toHaveLength(1)
    expect(
      selectNotificationsToPush({ ...base, preferences: { ...all, status: false } }).toSend
    ).toEqual([])
  })

  it('un aviso suelto dice en qué trámite y quién lo lleva ahora', () => {
    expect(buildPushPayload([change()])).toMatchObject({
      title: 'Nuevo responsable en «Alta de autónomo»',
      body: 'Ahora te atiende Ana García.',
    })
  })

  it('en un resumen se cuenta aparte de los cambios de estado', () => {
    const payload = buildPushPayload([change(), n({ reason: 'status_change' }), n({ reason: 'unread_chatter' })])
    expect(payload?.body).toContain('1 cambio de responsable')
    expect(payload?.body).toContain('1 cambio de estado')
  })
})

describe('buildPushPayload', () => {
  it('sin avisos no hay payload', () => {
    expect(buildPushPayload([])).toBeNull()
  })

  it('mensaje: título con el trámite y cuerpo con el extracto', () => {
    const previews = new Map([[10, 'Sube el modelo 303, por favor']])
    expect(buildPushPayload([n({ recordId: 5 })], previews)).toEqual({
      title: 'Nuevo mensaje en «IRPF 2025»',
      body: 'Sube el modelo 303, por favor',
      url: '/tramites?open=tramite-5&tab=conversation',
      tag: pushKeyForNotification(n({ recordId: 5 })),
    })
  })

  it('mensaje sin extracto usa un texto genérico', () => {
    expect(buildPushPayload([n({})])?.body).toBe('Tu asesoría te ha escrito.')
    expect(
      buildPushPayload([n({})], new Map([[999, 'de otro mensaje']]))?.body
    ).toBe('Tu asesoría te ha escrito.')
  })

  it('cambios solicitados: lo dice en el cuerpo', () => {
    const payload = buildPushPayload([
      n({
        reason: 'status_change',
        latestMessageId: undefined,
        newStateLabel: 'Requiere tu atención',
        previousStateLabel: 'En curso',
      }),
    ])
    expect(payload?.title).toBe('«IRPF 2025»: Requiere tu atención')
    expect(payload?.body).toBe('Tu asesoría necesita algo de ti. Entra para verlo.')
  })

  it('otro cambio de estado: dice el nuevo y el anterior', () => {
    const payload = buildPushPayload([
      n({
        reason: 'status_change',
        latestMessageId: undefined,
        newStateLabel: 'Hecho',
        previousStateLabel: 'En curso',
      }),
    ])
    expect(payload?.title).toBe('«IRPF 2025»: Hecho')
    expect(payload?.body).toBe('Antes: En curso')
  })

  it('cambio de estado sin etiquetas: texto genérico', () => {
    const payload = buildPushPayload([
      n({ reason: 'status_change', latestMessageId: undefined }),
    ])
    expect(payload?.title).toBe('Novedad en «IRPF 2025»')
    expect(payload?.body).toBe('El estado ha cambiado.')
  })

  it('trámite nuevo y firmas', () => {
    const nuevo = buildPushPayload([n({ reason: 'new_tramite', latestMessageId: undefined })])
    expect(nuevo?.title).toBe('Nuevo trámite: «IRPF 2025»')
    expect(nuevo?.body).toBe('Tu asesoría ha abierto un trámite para ti.')

    const firma = buildPushPayload([n({ reason: 'new_firma', scope: 'firma' })])
    expect(firma).toMatchObject({ title: 'Tienes una firma pendiente', body: 'IRPF 2025' })
    const due = buildPushPayload([n({ reason: 'firma_due_soon', scope: 'firma' })])
    expect(due?.title).toBe('Una firma está a punto de vencer')
  })

  it('varios avisos: resumen con el recuento por tipo que lleva al inicio', () => {
    const payload = buildPushPayload([
      n({ recordId: 1 }),
      n({ recordId: 2 }),
      n({ recordId: 3, reason: 'status_change', latestMessageId: undefined }),
      n({ recordId: 4, reason: 'new_tramite', latestMessageId: undefined }),
      n({ recordId: 5, reason: 'new_firma', scope: 'firma', latestMessageId: undefined }),
    ])
    expect(payload).toEqual({
      title: 'Tienes 5 novedades en Syntia',
      body: '2 mensajes · 1 cambio de estado · 1 trámite nuevo · 1 firma',
      url: '/dashboard',
      tag: 'syntia-summary',
    })
  })

  it('el resumen solo nombra los tipos presentes, en singular y plural', () => {
    expect(
      buildPushPayload([n({ recordId: 1 }), n({ recordId: 2, latestMessageId: 11 })])?.body
    ).toBe('2 mensajes')
    expect(
      buildPushPayload([
        n({ recordId: 1, reason: 'status_change', latestMessageId: undefined }),
        n({ recordId: 2, reason: 'status_change', latestMessageId: undefined }),
      ])?.body
    ).toBe('2 cambios de estado')
  })
})

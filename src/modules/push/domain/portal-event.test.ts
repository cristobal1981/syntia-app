import { describe, expect, it } from 'vitest'

import {
  collapseEvents,
  eventToNotification,
  parsePortalEventInput,
  previewsFromEvents,
  type PortalEventRow,
} from '@/src/modules/push/domain/portal-event'

const valid = {
  event_id: 'msg:456',
  partner_id: 12,
  kind: 'message',
  scope: 'tramite',
  record_id: 99,
  record_name: 'Alta de autónomo',
  message_id: 456,
  message_body: '<p>Hola, <b>sube</b> el modelo 303</p>',
  occurred_at: '2026-10-22T10:00:00Z',
}

function row(partial: Partial<PortalEventRow> = {}): PortalEventRow {
  return {
    seq: 1,
    eventId: 'e1',
    partnerId: 12,
    kind: 'message',
    scope: 'tramite',
    recordId: 99,
    recordName: 'IRPF',
    stateLabel: null,
    previousStateLabel: null,
    messageId: 10,
    excerpt: null,
    byClient: false,
    occurredAt: '2026-10-22T10:00:00.000Z',
    receivedAt: '2026-10-22T10:00:01.000Z',
    ...partial,
  }
}

describe('parsePortalEventInput', () => {
  it('acepta un mensaje y reduce el HTML a un extracto en texto plano', () => {
    expect(parsePortalEventInput(valid)).toEqual({
      eventId: 'msg:456',
      partnerId: 12,
      kind: 'message',
      scope: 'tramite',
      recordId: 99,
      recordName: 'Alta de autónomo',
      stateLabel: null,
      previousStateLabel: null,
      messageId: 456,
      excerpt: 'Hola, sube el modelo 303',
      byClient: false,
      occurredAt: '2026-10-22T10:00:00.000Z',
    })
  })

  it('no guarda HTML ni scripts en el extracto', () => {
    const parsed = parsePortalEventInput({
      ...valid,
      message_body: '<p>Texto</p><script>alert(1)</script><img src=x onerror=alert(1)>',
    })
    expect(parsed?.excerpt).toBe('Texto')
  })

  it('solo lee los primeros 50.000 caracteres del cuerpo', () => {
    const body = `<p>hola</p>${' '.repeat(50_000)}<p>oculto</p>`
    expect(parsePortalEventInput({ ...valid, message_body: body })?.excerpt).toBe('hola')
  })

  it('un mensaje sin texto aprovechable queda sin extracto', () => {
    expect(parsePortalEventInput({ ...valid, message_body: '<p> </p>' })?.excerpt).toBeNull()
    expect(parsePortalEventInput({ ...valid, message_body: undefined })?.excerpt).toBeNull()
  })

  it('un cambio de estado guarda las etiquetas y no el cuerpo', () => {
    const parsed = parsePortalEventInput({
      event_id: 'task:99:1',
      partner_id: 12,
      kind: 'status',
      scope: 'consulta',
      record_id: 99,
      record_name: 'Consulta IVA',
      state_label: 'En curso',
      previous_state_label: 'Pendiente',
      message_body: '<p>no debe guardarse</p>',
      occurred_at: '2026-10-22T10:00:00Z',
    })
    expect(parsed).toMatchObject({
      kind: 'status',
      stateLabel: 'En curso',
      previousStateLabel: 'Pendiente',
      excerpt: null,
      messageId: null,
    })
  })

  it('by_client es opcional y solo cuenta si es true', () => {
    expect(parsePortalEventInput(valid)?.byClient).toBe(false)
    expect(parsePortalEventInput({ ...valid, by_client: true })?.byClient).toBe(true)
    expect(parsePortalEventInput({ ...valid, by_client: 'sí' })).toBeNull()
  })

  it('una firma solo es válida con tipo new_firma, y al revés', () => {
    const firma = { ...valid, kind: 'new_firma', scope: 'firma', message_id: undefined }
    expect(parsePortalEventInput(firma)).toMatchObject({ kind: 'new_firma', scope: 'firma' })
    expect(parsePortalEventInput({ ...firma, kind: 'status' })).toBeNull()
    expect(parsePortalEventInput({ ...valid, kind: 'new_firma' })).toBeNull()
  })

  it('un mensaje exige id de mensaje', () => {
    expect(parsePortalEventInput({ ...valid, message_id: undefined })).toBeNull()
    expect(parsePortalEventInput({ ...valid, message_id: null })).toBeNull()
  })

  it.each([
    ['sin event_id', { event_id: '' }],
    ['event_id no texto', { event_id: 5 }],
    ['partner_id cero', { partner_id: 0 }],
    ['partner_id negativo', { partner_id: -1 }],
    ['partner_id decimal', { partner_id: 1.5 }],
    ['partner_id como texto', { partner_id: '12' }],
    ['record_id inválido', { record_id: 'x' }],
    ['sin nombre', { record_name: '   ' }],
    ['tipo desconocido', { kind: 'delete' }],
    ['ámbito desconocido', { scope: 'admin' }],
    ['message_id inválido', { message_id: -4 }],
    ['fecha inválida', { occurred_at: 'ayer' }],
    ['fecha ausente', { occurred_at: undefined }],
  ])('rechaza %s', (_name, override) => {
    expect(parsePortalEventInput({ ...valid, ...override })).toBeNull()
  })

  it.each([null, undefined, 'x', 7, []])('rechaza un cuerpo que no es objeto (%s)', (input) => {
    expect(parsePortalEventInput(input)).toBeNull()
  })

  it('acota nombre, etiquetas e identificador', () => {
    const parsed = parsePortalEventInput({
      ...valid,
      event_id: 'e'.repeat(500),
      record_name: 'n'.repeat(500),
      state_label: 's'.repeat(500),
    })
    expect(parsed?.eventId).toHaveLength(200)
    expect(parsed?.recordName).toHaveLength(200)
    expect(parsed?.stateLabel).toHaveLength(100)
  })

  it('normaliza la fecha a ISO UTC', () => {
    expect(parsePortalEventInput({ ...valid, occurred_at: '2026-10-22T12:00:00+02:00' })?.occurredAt).toBe(
      '2026-10-22T10:00:00.000Z'
    )
  })
})

describe('eventToNotification', () => {
  it.each([
    ['message', 'unread_chatter'],
    ['status', 'status_change'],
    ['new_record', 'new_tramite'],
    ['new_firma', 'new_firma'],
  ] as const)('el tipo %s es el aviso %s', (kind, reason) => {
    expect(eventToNotification(row({ kind })).reason).toBe(reason)
  })

  it('copia lo necesario para el texto y el enlace del push', () => {
    expect(
      eventToNotification(
        row({
          kind: 'status',
          stateLabel: 'Hecho',
          previousStateLabel: 'En curso',
          messageId: null,
        })
      )
    ).toEqual({
      scope: 'tramite',
      recordId: 99,
      name: 'IRPF',
      reason: 'status_change',
      latestDate: '2026-10-22T10:00:00.000Z',
      listKind: 'tramite',
      latestMessageId: undefined,
      previousStateLabel: 'En curso',
      newStateLabel: 'Hecho',
    })
  })

  it('listKind solo existe en trámites y consultas', () => {
    expect(eventToNotification(row({ scope: 'consulta' })).listKind).toBe('consulta')
    expect(eventToNotification(row({ scope: 'obligacion' })).listKind).toBeUndefined()
    expect(eventToNotification(row({ scope: 'firma', kind: 'new_firma' })).listKind).toBeUndefined()
  })
})

describe('collapseEvents', () => {
  it('varios mensajes del mismo trámite son un solo aviso, el más reciente', () => {
    const result = collapseEvents([
      row({ seq: 1, messageId: 10 }),
      row({ seq: 3, messageId: 12 }),
      row({ seq: 2, messageId: 11 }),
    ])
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ seq: 3, messageId: 12 })
  })

  it('no mezcla tipos, registros ni ámbitos distintos', () => {
    const result = collapseEvents([
      row({ seq: 1, kind: 'message', recordId: 1 }),
      row({ seq: 2, kind: 'status', recordId: 1 }),
      row({ seq: 3, kind: 'message', recordId: 2 }),
      row({ seq: 4, kind: 'message', recordId: 1, scope: 'consulta' }),
    ])
    expect(result.map((event) => event.seq)).toEqual([1, 2, 3, 4])
  })

  it('devuelve por orden de llegada y no modifica la entrada', () => {
    const input = [row({ seq: 5, recordId: 1 }), row({ seq: 2, recordId: 2 })]
    const copy = [...input]
    expect(collapseEvents(input).map((event) => event.seq)).toEqual([2, 5])
    expect(input).toEqual(copy)
  })

  it('sin eventos no hay nada', () => {
    expect(collapseEvents([])).toEqual([])
  })
})

describe('previewsFromEvents', () => {
  it('mapea id de mensaje a extracto, solo cuando hay ambos', () => {
    const previews = previewsFromEvents([
      row({ messageId: 10, excerpt: 'Hola' }),
      row({ messageId: 11, excerpt: null }),
      row({ messageId: null, excerpt: 'suelto' }),
    ])
    expect([...previews]).toEqual([[10, 'Hola']])
  })
})

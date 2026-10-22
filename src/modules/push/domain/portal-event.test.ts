import { describe, expect, it } from 'vitest'

import {
  collapseEvents,
  eventToNotification,
  parsePortalEventPayload,
  previewsFromEvents,
  resolveStatusChange,
  type PortalEventInput,
  type PortalEventRow,
} from '@/src/modules/push/domain/portal-event'

const PREFIX = 'Obligaciones Fiscales'
const valid = {
  event_id: 'msg:456',
  partner_id: 12,
  kind: 'message',
  model: 'project.task',
  record_id: 99,
  record_name: 'Alta de autónomo',
  message_id: 456,
  message_body: '<p>Hola, <b>sube</b> el modelo 303</p>',
  occurred_at: '2026-10-22T10:00:00Z',
}

function parse(input: unknown) {
  return parsePortalEventPayload(input, { obligacionesPrefix: PREFIX })
}

function parsed(input: unknown): PortalEventInput | null {
  const result = parse(input)
  return result.status === 'ok' ? result.event : null
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

describe('parsePortalEventPayload', () => {
  it('acepta un mensaje y reduce el HTML a un extracto en texto plano', () => {
    expect(parse(valid)).toEqual({
      status: 'ok',
      event: {
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
      },
    })
  })

  it('sin modelo se entiende que es una tarea', () => {
    expect(parsed({ ...valid, model: undefined })?.scope).toBe('tramite')
  })

  it('no guarda HTML ni scripts en el extracto', () => {
    const event = parsed({
      ...valid,
      message_body: '<p>Texto</p><script>alert(1)</script><img src=x onerror=alert(1)>',
    })
    expect(event?.excerpt).toBe('Texto')
  })

  it('solo lee los primeros 50.000 caracteres del cuerpo', () => {
    const body = `<p>hola</p>${' '.repeat(50_000)}<p>oculto</p>`
    expect(parsed({ ...valid, message_body: body })?.excerpt).toBe('hola')
  })

  it('un mensaje sin texto aprovechable queda sin extracto', () => {
    expect(parsed({ ...valid, message_body: '<p> </p>' })?.excerpt).toBeNull()
    expect(parsed({ ...valid, message_body: undefined })?.excerpt).toBeNull()
  })

  describe('estado de una tarea', () => {
    const status = {
      event_id: 'task:99:1',
      partner_id: 12,
      kind: 'status',
      model: 'project.task',
      record_id: 99,
      record_name: 'IRPF',
      state: '1_done',
      previous_state: '01_in_progress',
      message_body: '<p>no debe guardarse</p>',
      occurred_at: '2026-10-22T10:00:00Z',
    }

    it('se traduce a la etiqueta que ve el cliente, no el código de Odoo', () => {
      expect(parsed(status)).toMatchObject({
        kind: 'status',
        stateLabel: 'Hecho',
        previousStateLabel: 'En curso',
        excerpt: null,
        messageId: null,
      })
    })

    it('sin estado anterior solo lleva el nuevo', () => {
      expect(parsed({ ...status, previous_state: undefined })).toMatchObject({
        stateLabel: 'Hecho',
        previousStateLabel: null,
      })
    })

    it('un cambio entre dos códigos que el cliente ve igual no avisa', () => {
      expect(parse({ ...status, state: '03_approved', previous_state: '01_in_progress' })).toEqual({
        status: 'ignored',
      })
    })

    it('«cambios solicitados» conserva su etiqueta propia', () => {
      expect(parsed({ ...status, state: '02_changes_requested' })?.stateLabel).toBe(
        'Cambios solicitados'
      )
    })

    it.each([undefined, '', '   ', 7])('rechaza un estado inválido (%s)', (state) => {
      expect(parse({ ...status, state })).toEqual({ status: 'invalid' })
    })
  })

  describe('ámbito', () => {
    it('un ticket de ayuda es una consulta y avisa de mensajes y altas', () => {
      expect(parsed({ ...valid, model: 'helpdesk.ticket' })?.scope).toBe('consulta')
      expect(
        parsed({
          event_id: 'new:5',
          partner_id: 12,
          kind: 'new_record',
          model: 'helpdesk.ticket',
          record_id: 5,
          record_name: 'Duda IVA',
          occurred_at: '2026-10-22T10:00:00Z',
        })
      ).toMatchObject({ scope: 'consulta', kind: 'new_record' })
    })

    it('el estado de un ticket no se publica', () => {
      expect(
        parse({ ...valid, model: 'helpdesk.ticket', kind: 'status', state: '1_done', message_id: undefined })
      ).toEqual({ status: 'ignored' })
    })

    it('una firma solo es válida con kind new_firma y modelo sign.request, y al revés', () => {
      const firma = {
        event_id: 'firma:7',
        partner_id: 12,
        kind: 'new_firma',
        model: 'sign.request',
        record_id: 7,
        record_name: 'Mandato SEPA',
        occurred_at: '2026-10-22T10:00:00Z',
      }
      expect(parsed(firma)).toMatchObject({ kind: 'new_firma', scope: 'firma' })
      expect(parse({ ...firma, kind: 'status' })).toEqual({ status: 'invalid' })
      expect(parse({ ...valid, kind: 'new_firma' })).toEqual({ status: 'invalid' })
    })

    it('un modelo desconocido se rechaza', () => {
      expect(parse({ ...valid, model: 'res.partner' })).toEqual({ status: 'invalid' })
    })
  })

  describe('obligaciones', () => {
    const leaf = {
      event_id: 'task:300:1',
      partner_id: 12,
      kind: 'status',
      model: 'project.task',
      record_id: 300,
      record_name: 'Modelo 111 - Retenciones IRPF - ACME SL',
      ancestor_names: ['Obligaciones Fiscales 2026', 'Trimestrales'],
      state: '1_done',
      previous_state: '01_in_progress',
      occurred_at: '2026-10-22T10:00:00Z',
    }

    it('una hoja raíz > periodo > hoja es de obligaciones, con el título «Modelo · periodo»', () => {
      expect(parsed(leaf)).toMatchObject({
        scope: 'obligacion',
        recordName: 'Modelo 111 · Trimestrales',
        stateLabel: 'Hecho',
      })
    })

    it('en periodos mensuales el periodo sale del mes del nombre', () => {
      const event = parsed({
        ...leaf,
        record_name: 'Modelo 303 - Enero - ACME SL',
        ancestor_names: ['Obligaciones Fiscales 2026', 'Mensuales'],
      })
      expect(event?.recordName).toBe('Modelo 303 · Enero')
    })

    it('un mensaje en una hoja de obligaciones también avisa', () => {
      expect(
        parsed({ ...leaf, kind: 'message', message_id: 5, message_body: '<p>Hola</p>', state: undefined })
      ).toMatchObject({ scope: 'obligacion', kind: 'message', excerpt: 'Hola' })
    })

    it('la raíz y los periodos no avisan', () => {
      expect(parse({ ...leaf, ancestor_names: [], record_name: 'Obligaciones Fiscales 2026' })).toEqual({
        status: 'ignored',
      })
      expect(parse({ ...leaf, ancestor_names: undefined, record_name: 'Obligaciones Fiscales 2026' })).toEqual({
        status: 'ignored',
      })
      expect(parse({ ...leaf, ancestor_names: ['Obligaciones Fiscales 2026'] })).toEqual({
        status: 'ignored',
      })
      expect(parse({ ...leaf, ancestor_names: ['Obligaciones Fiscales 2026', 'Trimestrales', 'Extra'] })).toEqual({
        status: 'ignored',
      })
    })

    it('las altas en bloque de cada año no avisan', () => {
      expect(parse({ ...leaf, kind: 'new_record', state: undefined })).toEqual({ status: 'ignored' })
    })

    it('el prefijo es el configurado, no uno fijo', () => {
      const other = parsePortalEventPayload(leaf, { obligacionesPrefix: 'Otro prefijo' })
      expect(other.status === 'ok' && other.event.scope).toBe('tramite')
    })
  })

  it('by_client es opcional y solo cuenta si es true', () => {
    expect(parsed(valid)?.byClient).toBe(false)
    expect(parsed({ ...valid, by_client: true })?.byClient).toBe(true)
    expect(parse({ ...valid, by_client: 'sí' })).toEqual({ status: 'invalid' })
  })

  it('un mensaje exige id de mensaje', () => {
    expect(parse({ ...valid, message_id: undefined })).toEqual({ status: 'invalid' })
    expect(parse({ ...valid, message_id: null })).toEqual({ status: 'invalid' })
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
    ['message_id inválido', { message_id: -4 }],
    ['fecha inválida', { occurred_at: 'ayer' }],
    ['fecha ausente', { occurred_at: undefined }],
    ['ancestros que no son lista', { ancestor_names: 'Obligaciones' }],
    ['ancestro que no es texto', { ancestor_names: [5] }],
    ['demasiados ancestros', { ancestor_names: Array.from({ length: 11 }, () => 'x') }],
  ])('rechaza %s', (_name, override) => {
    expect(parse({ ...valid, ...override })).toEqual({ status: 'invalid' })
  })

  it.each([null, undefined, 'x', 7, []])('rechaza un cuerpo que no es objeto (%s)', (input) => {
    expect(parse(input)).toEqual({ status: 'invalid' })
  })

  it('acota nombre e identificador', () => {
    const event = parsed({ ...valid, event_id: 'e'.repeat(500), record_name: 'n'.repeat(500) })
    expect(event?.eventId).toHaveLength(200)
    expect(event?.recordName).toHaveLength(200)
  })

  it('normaliza la fecha a ISO UTC', () => {
    expect(parsed({ ...valid, occurred_at: '2026-10-22T12:00:00+02:00' })?.occurredAt).toBe(
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

describe('payloads reales capturados del Odoo de pruebas', () => {
  const real = {
    newTask: {
      event_id: 'task-new:20393',
      model: 'project.task',
      kind: 'new_record',
      record_id: 20393,
      record_name: 'T20393 · PRUEBA eventos Syntia (borrar)',
      ancestor_names: [],
      partner_id: 251,
      state: '01_in_progress',
      previous_state: '',
      occurred_at: '2026-10-22T12:03:10Z',
    },
    status: {
      event_id: 'task-state:20393:2026-10-22T12:03:11Z',
      model: 'project.task',
      kind: 'status',
      record_id: 20393,
      record_name: 'T20393 · PRUEBA eventos Syntia (borrar)',
      ancestor_names: [],
      partner_id: 251,
      state: '1_done',
      previous_state: '',
      occurred_at: '2026-10-22T12:03:11Z',
    },
    staffMessage: {
      event_id: 'msg:248323',
      model: 'project.task',
      kind: 'message',
      record_id: 20393,
      record_name: 'T20393 · PRUEBA eventos Syntia (borrar)',
      ancestor_names: [],
      partner_id: 251,
      message_id: 248323,
      message_body: '<p>Hola, <b>sube</b> el modelo 303 cuando puedas</p>',
      by_client: false,
      occurred_at: '2026-10-22T12:03:12Z',
    },
    clientMessage: {
      event_id: 'msg:248324',
      model: 'project.task',
      kind: 'message',
      record_id: 20393,
      record_name: 'T20393 · PRUEBA eventos Syntia (borrar)',
      ancestor_names: [],
      partner_id: 251,
      message_id: 248324,
      message_body: '<p>Ya lo he subido</p>',
      by_client: true,
      occurred_at: '2026-10-22T12:03:13Z',
    },
  }

  it('una tarea nueva con estado anterior vacío es válida', () => {
    expect(parsed(real.newTask)).toMatchObject({ kind: 'new_record', scope: 'tramite', partnerId: 251 })
  })

  it('un cambio de estado con estado anterior vacío queda sin estado anterior', () => {
    expect(parsed(real.status)).toMatchObject({
      kind: 'status',
      stateLabel: 'Hecho',
      previousStateLabel: null,
    })
  })

  it('el mensaje del asesor lleva extracto y no es del cliente; el del cliente sí', () => {
    expect(parsed(real.staffMessage)).toMatchObject({
      excerpt: 'Hola, sube el modelo 303 cuando puedas',
      byClient: false,
    })
    expect(parsed(real.clientMessage)).toMatchObject({ excerpt: 'Ya lo he subido', byClient: true })
  })
})

describe('resolveStatusChange', () => {
  const status = parsed({
    event_id: 's1',
    partner_id: 1,
    kind: 'status',
    record_id: 9,
    record_name: 'IRPF',
    state: '1_done',
    occurred_at: '2026-10-22T10:00:00Z',
  })!

  it('un evento que no es de estado pasa tal cual', () => {
    const message = parsed(valid)!
    expect(resolveStatusChange(message, 'Hecho')).toBe(message)
  })

  it('sin estado conocido de antes pasa tal cual (puede ser el primero)', () => {
    expect(resolveStatusChange(status, null)).toBe(status)
  })

  it('el mismo estado visible que el último conocido no es un cambio', () => {
    expect(resolveStatusChange(status, 'Hecho')).toBeNull()
  })

  it('completa el estado anterior con el último conocido', () => {
    expect(resolveStatusChange(status, 'En curso')).toMatchObject({
      stateLabel: 'Hecho',
      previousStateLabel: 'En curso',
    })
  })

  it('si Odoo ya mandó el estado anterior, lo respeta', () => {
    const withPrevious = { ...status, previousStateLabel: 'Cancelado' }
    expect(resolveStatusChange(withPrevious, 'En curso')).toBe(withPrevious)
  })
})

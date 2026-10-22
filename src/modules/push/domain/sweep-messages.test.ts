import { describe, expect, it } from 'vitest'

import {
  buildSweepPayloads,
  type SweepMessage,
  type SweepTask,
  type SweepTicket,
} from '@/src/modules/push/domain/sweep-messages'

const PREFIX = 'Obligaciones Fiscales'

function message(partial: Partial<SweepMessage> = {}): SweepMessage {
  return {
    id: 100,
    model: 'project.task',
    resId: 1,
    body: '<p>Hola</p>',
    authorId: 7,
    date: '2026-10-22 10:00:00',
    ...partial,
  }
}

function task(partial: Partial<SweepTask> & { id: number }): SweepTask {
  return {
    name: `Tarea ${partial.id}`,
    parentId: null,
    projectId: 10,
    partnerId: null,
    showInSyntia: true,
    ...partial,
  }
}

function build(
  messages: SweepMessage[],
  tasks: SweepTask[] = [task({ id: 1 })],
  extra: {
    tickets?: SweepTicket[]
    projectPartners?: [number, number | null][]
  } = {}
) {
  return buildSweepPayloads({
    messages,
    tasks: new Map(tasks.map((entry) => [entry.id, entry])),
    tickets: new Map((extra.tickets ?? []).map((entry) => [entry.id, entry])),
    projectPartners: new Map(extra.projectPartners ?? [[10, 55]]),
    obligacionesPrefix: PREFIX,
  })
}

describe('buildSweepPayloads: tareas', () => {
  it('genera el mismo cuerpo que la acción de Odoo', () => {
    expect(build([message()])).toEqual([
      {
        event_id: 'msg:100',
        kind: 'message',
        message_id: 100,
        message_body: '<p>Hola</p>',
        occurred_at: '2026-10-22T10:00:00.000Z',
        model: 'project.task',
        record_id: 1,
        record_name: 'Tarea 1',
        ancestor_names: [],
        partner_id: 55,
        by_client: false,
      },
    ])
  })

  it('el cliente sale del proyecto y, si no, de la propia tarea', () => {
    const withoutProject = build([message()], [task({ id: 1, partnerId: 9 })], {
      projectPartners: [[10, null]],
    })
    expect(withoutProject[0]).toMatchObject({ partner_id: 9 })

    const projectWins = build([message()], [task({ id: 1, partnerId: 9 })])
    expect(projectWins[0]).toMatchObject({ partner_id: 55 })
  })

  it('sin cliente en el proyecto ni en la tarea no hay evento', () => {
    expect(build([message()], [task({ id: 1 })], { projectPartners: [[10, null]] })).toEqual([])
  })

  it('una tarea sin proyecto usa el cliente de la tarea', () => {
    const payloads = build([message()], [task({ id: 1, projectId: null, partnerId: 9 })])
    expect(payloads[0]).toMatchObject({ partner_id: 9 })
  })

  it('un mensaje del propio cliente se marca by_client', () => {
    expect(build([message({ authorId: 55 })])[0]).toMatchObject({ by_client: true })
  })

  it('un mensaje sin autor no es del cliente', () => {
    expect(build([message({ authorId: null })])[0]).toMatchObject({ by_client: false })
  })

  it('una tarea que Odoo ya no devuelve no genera evento', () => {
    expect(build([message({ resId: 999 })])).toEqual([])
  })

  describe('visibilidad en Syntia', () => {
    it('una tarea sin el flag ni raíz de obligaciones no avisa', () => {
      expect(build([message()], [task({ id: 1, showInSyntia: false })])).toEqual([])
    })

    it('una subtarea sin flag cuenta si un ancestro lo tiene', () => {
      const payloads = build([message({ resId: 2 })], [
        task({ id: 1, name: 'Raíz', showInSyntia: true }),
        task({ id: 2, name: 'Hija', parentId: 1, showInSyntia: false }),
      ])
      expect(payloads[0]).toMatchObject({ record_id: 2, ancestor_names: ['Raíz'] })
    })

    it('el árbol de obligaciones es visible aunque ninguna tarea tenga el flag', () => {
      const payloads = build([message({ resId: 3 })], [
        task({ id: 1, name: 'Obligaciones Fiscales 2026', showInSyntia: false }),
        task({ id: 2, name: 'Trimestre 3', parentId: 1, showInSyntia: false }),
        task({ id: 3, name: 'Modelo 111 T3 - ACME', parentId: 2, showInSyntia: false }),
      ])
      expect(payloads[0]).toMatchObject({
        record_id: 3,
        ancestor_names: ['Obligaciones Fiscales 2026', 'Trimestre 3'],
      })
    })

    it('la raíz de obligaciones sin ancestros se reconoce por su propio nombre', () => {
      const payloads = build([message()], [
        task({ id: 1, name: 'Obligaciones Fiscales 2026', showInSyntia: false }),
      ])
      expect(payloads).toHaveLength(1)
    })

    it('el prefijo es el configurado', () => {
      const payloads = buildSweepPayloads({
        messages: [message()],
        tasks: new Map([[1, task({ id: 1, name: 'Otra cosa', showInSyntia: false })]]),
        tickets: new Map(),
        projectPartners: new Map([[10, 55]]),
        obligacionesPrefix: 'Otra',
      })
      expect(payloads).toHaveLength(1)
    })
  })

  describe('cadena de padres', () => {
    it('los nombres de los ancestros van con la raíz primero', () => {
      const payloads = build([message({ resId: 3 })], [
        task({ id: 1, name: 'Abuelo' }),
        task({ id: 2, name: 'Padre', parentId: 1 }),
        task({ id: 3, name: 'Hijo', parentId: 2 }),
      ])
      expect(payloads[0]).toMatchObject({ ancestor_names: ['Abuelo', 'Padre'] })
    })

    it('si falta un padre en los datos no se inventa: se salta el mensaje', () => {
      expect(
        build([message({ resId: 2 })], [task({ id: 2, name: 'Hija', parentId: 1 })])
      ).toEqual([])
    })

    it('si falta un abuelo tampoco', () => {
      expect(
        build([message({ resId: 3 })], [
          task({ id: 2, name: 'Padre', parentId: 1 }),
          task({ id: 3, name: 'Hijo', parentId: 2 }),
        ])
      ).toEqual([])
    })

    it('un ciclo de padres no cuelga: se corta a los 10 niveles', () => {
      const payloads = build([message({ resId: 1 })], [
        task({ id: 1, name: 'A', parentId: 2 }),
        task({ id: 2, name: 'B', parentId: 1 }),
      ])
      expect(payloads).toHaveLength(1)
      expect((payloads[0]!.ancestor_names as string[]).length).toBeLessThanOrEqual(10)
    })
  })
})

describe('buildSweepPayloads: tickets', () => {
  const ticket: SweepTicket = { id: 5, name: 'Duda IVA', partnerId: 77 }

  it('un mensaje de ticket va con el cliente del ticket y sin ancestros', () => {
    const payloads = build([message({ model: 'helpdesk.ticket', resId: 5 })], [], {
      tickets: [ticket],
    })
    expect(payloads).toEqual([
      {
        event_id: 'msg:100',
        kind: 'message',
        message_id: 100,
        message_body: '<p>Hola</p>',
        occurred_at: '2026-10-22T10:00:00.000Z',
        model: 'helpdesk.ticket',
        record_id: 5,
        record_name: 'Duda IVA',
        ancestor_names: [],
        partner_id: 77,
        by_client: false,
      },
    ])
  })

  it('el mensaje del cliente en su ticket se marca by_client', () => {
    const payloads = build([message({ model: 'helpdesk.ticket', resId: 5, authorId: 77 })], [], {
      tickets: [ticket],
    })
    expect(payloads[0]).toMatchObject({ by_client: true })
  })

  it('un ticket sin cliente o desconocido no genera evento', () => {
    expect(
      build([message({ model: 'helpdesk.ticket', resId: 5 })], [], {
        tickets: [{ ...ticket, partnerId: null }],
      })
    ).toEqual([])
    expect(build([message({ model: 'helpdesk.ticket', resId: 404 })], [])).toEqual([])
  })
})

describe('buildSweepPayloads: varios mensajes', () => {
  it('mantiene el orden y salta solo los que no valen', () => {
    const payloads = build(
      [message({ id: 1, resId: 1 }), message({ id: 2, resId: 999 }), message({ id: 3, resId: 1 })],
      [task({ id: 1 })]
    )
    expect(payloads.map((payload) => payload.event_id)).toEqual(['msg:1', 'msg:3'])
  })

  it('sin mensajes no hay nada', () => {
    expect(build([])).toEqual([])
  })
})

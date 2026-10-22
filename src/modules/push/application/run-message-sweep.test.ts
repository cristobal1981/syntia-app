import { describe, expect, it, vi } from 'vitest'

import {
  runMessageSweep,
  SWEEP_MAX_PAGES,
  SWEEP_PAGE_SIZE,
  SWEEP_QUIET_MS,
  type MessageSweepDeps,
} from '@/src/modules/push/application/run-message-sweep'
import type { SweepMessage, SweepTask } from '@/src/modules/push/domain/sweep-messages'

const NOW = Date.parse('2026-10-22T12:00:00Z')

function msg(id: number, partial: Partial<SweepMessage> = {}): SweepMessage {
  return {
    id,
    model: 'project.task',
    resId: 1,
    body: '<p>Hola</p>',
    authorId: 7,
    date: '2026-10-22 10:00:00',
    ...partial,
  }
}

const visibleTask: SweepTask = {
  id: 1,
  name: 'IRPF',
  parentId: null,
  projectId: 10,
  partnerId: null,
  showInSyntia: true,
}

function setup(overrides: Partial<MessageSweepDeps> = {}) {
  const deps: MessageSweepDeps = {
    getCursor: vi.fn().mockResolvedValue(50),
    setCursor: vi.fn().mockResolvedValue(undefined),
    getMaxMessageId: vi.fn().mockResolvedValue(500),
    fetchMessages: vi.fn().mockResolvedValue([msg(51)]),
    fetchTasks: vi.fn().mockResolvedValue(new Map([[1, visibleTask]])),
    fetchTickets: vi.fn().mockResolvedValue(new Map()),
    fetchProjectPartners: vi.fn().mockResolvedValue(new Map([[10, 55]])),
    insertEvent: vi.fn().mockResolvedValue('created'),
    now: () => NOW,
    obligacionesPrefix: 'Obligaciones Fiscales',
    ...overrides,
  }
  return deps
}

describe('runMessageSweep', () => {
  it('crea el evento de un mensaje que no llegó y avanza el cursor', async () => {
    const deps = setup()
    const summary = await runMessageSweep(deps)

    expect(deps.insertEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: 'msg:51',
        partnerId: 55,
        kind: 'message',
        scope: 'tramite',
        recordId: 1,
        excerpt: 'Hola',
        byClient: false,
      })
    )
    expect(deps.setCursor).toHaveBeenCalledWith(51)
    expect(summary).toEqual({
      scanned: 1,
      created: 1,
      existing: 0,
      skipped: 0,
      baselined: false,
      more: false,
    })
  })

  it('un evento que ya estaba cuenta como existente, no como creado', async () => {
    const deps = setup({ insertEvent: vi.fn().mockResolvedValue('duplicate') })
    const summary = await runMessageSweep(deps)

    expect(summary).toMatchObject({ created: 0, existing: 1 })
  })

  it('espera diez minutos antes de revisar un mensaje', async () => {
    const deps = setup()
    await runMessageSweep(deps)

    expect(deps.fetchMessages).toHaveBeenCalledWith(
      50,
      new Date(NOW - SWEEP_QUIET_MS),
      SWEEP_PAGE_SIZE
    )
    expect(SWEEP_QUIET_MS).toBe(600_000)
  })

  describe('primera ejecución', () => {
    it('parte del último mensaje existente sin recuperar histórico', async () => {
      const deps = setup({ getCursor: vi.fn().mockResolvedValue(null) })
      const summary = await runMessageSweep(deps)

      expect(deps.getMaxMessageId).toHaveBeenCalledWith(new Date(NOW - SWEEP_QUIET_MS))
      expect(deps.setCursor).toHaveBeenCalledWith(500)
      expect(deps.fetchMessages).not.toHaveBeenCalled()
      expect(deps.insertEvent).not.toHaveBeenCalled()
      expect(summary.baselined).toBe(true)
    })
  })

  describe('sin novedades', () => {
    it('sin mensajes nuevos no toca Odoo más ni mueve el cursor', async () => {
      const deps = setup({ fetchMessages: vi.fn().mockResolvedValue([]) })
      const summary = await runMessageSweep(deps)

      expect(deps.fetchTasks).not.toHaveBeenCalled()
      expect(deps.setCursor).not.toHaveBeenCalled()
      expect(summary).toMatchObject({ scanned: 0, created: 0 })
    })

    it('solo pide tareas si hay mensajes de tareas, y solo tickets si hay de tickets', async () => {
      const onlyTickets = setup({
        fetchMessages: vi.fn().mockResolvedValue([msg(51, { model: 'helpdesk.ticket', resId: 5 })]),
        fetchTickets: vi.fn().mockResolvedValue(new Map([[5, { id: 5, name: 'Duda', partnerId: 9 }]])),
      })
      await runMessageSweep(onlyTickets)
      expect(onlyTickets.fetchTasks).not.toHaveBeenCalled()
      expect(onlyTickets.fetchProjectPartners).not.toHaveBeenCalled()
      expect(onlyTickets.insertEvent).toHaveBeenCalledWith(
        expect.objectContaining({ scope: 'consulta', partnerId: 9 })
      )

      const onlyTasks = setup()
      await runMessageSweep(onlyTasks)
      expect(onlyTasks.fetchTickets).not.toHaveBeenCalled()
    })

    it('pide cada tarea y cada proyecto una sola vez', async () => {
      const deps = setup({
        fetchMessages: vi.fn().mockResolvedValue([msg(51), msg(52), msg(53, { resId: 2 })]),
        fetchTasks: vi.fn().mockResolvedValue(
          new Map([
            [1, visibleTask],
            [2, { ...visibleTask, id: 2, projectId: 10 }],
          ])
        ),
      })
      await runMessageSweep(deps)

      expect(deps.fetchTasks).toHaveBeenCalledWith([1, 2])
      expect(deps.fetchProjectPartners).toHaveBeenCalledWith([10])
    })
  })

  describe('mensajes que no avisan', () => {
    it('una tarea no visible se cuenta como saltada y el cursor avanza igual', async () => {
      const deps = setup({
        fetchTasks: vi.fn().mockResolvedValue(new Map([[1, { ...visibleTask, showInSyntia: false }]])),
      })
      const summary = await runMessageSweep(deps)

      expect(deps.insertEvent).not.toHaveBeenCalled()
      expect(summary).toMatchObject({ scanned: 1, skipped: 1, created: 0 })
      expect(deps.setCursor).toHaveBeenCalledWith(51)
    })

    it('un mensaje que el validador rechaza se cuenta como saltado', async () => {
      const deps = setup({
        fetchMessages: vi.fn().mockResolvedValue([msg(51, { date: 'fecha rota' })]),
      })
      const summary = await runMessageSweep(deps)

      expect(deps.insertEvent).not.toHaveBeenCalled()
      expect(summary).toMatchObject({ scanned: 1, skipped: 1 })
    })

    it('un mensaje del propio cliente se guarda como by_client', async () => {
      const deps = setup({
        fetchMessages: vi.fn().mockResolvedValue([msg(51, { authorId: 55 })]),
      })
      await runMessageSweep(deps)

      expect(deps.insertEvent).toHaveBeenCalledWith(expect.objectContaining({ byClient: true }))
    })
  })

  describe('páginas', () => {
    function page(from: number, size: number) {
      return Array.from({ length: size }, (_, i) => msg(from + i))
    }

    it('con una página llena sigue con la siguiente hasta que viene incompleta', async () => {
      const fetchMessages = vi
        .fn()
        .mockResolvedValueOnce(page(51, SWEEP_PAGE_SIZE))
        .mockResolvedValueOnce(page(51 + SWEEP_PAGE_SIZE, 3))
      const deps = setup({ fetchMessages })
      const summary = await runMessageSweep(deps)

      expect(fetchMessages).toHaveBeenCalledTimes(2)
      expect(fetchMessages.mock.calls[1]![0]).toBe(50 + SWEEP_PAGE_SIZE)
      expect(summary.scanned).toBe(SWEEP_PAGE_SIZE + 3)
      expect(summary.more).toBe(false)
      expect(deps.setCursor).toHaveBeenLastCalledWith(50 + SWEEP_PAGE_SIZE + 3)
    })

    it('guarda el cursor tras cada página', async () => {
      const deps = setup({
        fetchMessages: vi
          .fn()
          .mockResolvedValueOnce(page(51, SWEEP_PAGE_SIZE))
          .mockResolvedValueOnce([]),
      })
      await runMessageSweep(deps)

      expect(deps.setCursor).toHaveBeenCalledTimes(1)
      expect(deps.setCursor).toHaveBeenCalledWith(50 + SWEEP_PAGE_SIZE)
    })

    it('se detiene al llegar al máximo de páginas y lo indica', async () => {
      let next = 51
      const fetchMessages = vi.fn().mockImplementation(async () => {
        const messages = page(next, SWEEP_PAGE_SIZE)
        next += SWEEP_PAGE_SIZE
        return messages
      })
      const summary = await runMessageSweep(setup({ fetchMessages }))

      expect(fetchMessages).toHaveBeenCalledTimes(SWEEP_MAX_PAGES)
      expect(summary.more).toBe(true)
    })
  })

  describe('fallos', () => {
    it('si falla guardar un evento no avanza el cursor de esa página', async () => {
      const deps = setup({ insertEvent: vi.fn().mockRejectedValue(new Error('bd')) })

      await expect(runMessageSweep(deps)).rejects.toThrow('bd')
      expect(deps.setCursor).not.toHaveBeenCalled()
    })

    it('si falla Odoo no avanza el cursor', async () => {
      const deps = setup({ fetchTasks: vi.fn().mockRejectedValue(new Error('odoo')) })

      await expect(runMessageSweep(deps)).rejects.toThrow('odoo')
      expect(deps.setCursor).not.toHaveBeenCalled()
    })
  })
})

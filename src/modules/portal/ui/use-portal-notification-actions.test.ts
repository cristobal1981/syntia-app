// @vitest-environment jsdom
// Tests de las acciones sobre notificaciones ya recibidas (marcar visto, confirmar, descartar, abrir).
// Las llamadas al servidor y la navegación se sustituyen por dobles; la lógica de listas es la real.
// Las referencias y callbacks que se pasan al hook son estables entre renders (ver use-chatter-messages.test.ts).
import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  ackPortalNotificationAction: vi.fn(),
  markChatterConversationSeenAction: vi.fn(),
  acknowledgeTramiteListItemSeenAction: vi.fn(),
  dispatchTramitesListItemSeen: vi.fn(),
  openPortalUrl: vi.fn(),
}))

vi.mock('@/src/modules/portal/application/portal-chatter-notifications-actions', () => ({
  ackPortalNotificationAction: mocks.ackPortalNotificationAction,
  markChatterConversationSeenAction: mocks.markChatterConversationSeenAction,
}))
vi.mock('@/src/modules/tramites/application/tramites-list-seen-actions', () => ({
  acknowledgeTramiteListItemSeenAction: mocks.acknowledgeTramiteListItemSeenAction,
}))
vi.mock('@/src/modules/tramites/domain/tramites-list-seen-events', () => ({
  dispatchTramitesListItemSeen: mocks.dispatchTramitesListItemSeen,
}))
vi.mock('@/src/modules/portal/ui/shallow-url', () => ({ openPortalUrl: mocks.openPortalUrl }))

import type { PortalNotification } from '@/src/modules/portal/domain/portal-notifications-types'
import { usePortalNotificationActions } from '@/src/modules/portal/ui/use-portal-notification-actions'

type ActionsArgs = Parameters<typeof usePortalNotificationActions>[0]

const note = (overrides: Partial<PortalNotification> = {}): PortalNotification => ({
  scope: 'tramite',
  recordId: 5,
  name: 'Trámite',
  reason: 'unread_chatter',
  latestDate: '2026-10-29T10:00:00Z',
  recordKind: 'task',
  listKind: 'tramite',
  latestMessageId: 50,
  ...overrides,
})

function mount(options: { enabled?: boolean; unread?: PortalNotification[]; readState?: Record<string, number> } = {}) {
  // Referencias y callbacks estables: si cambiaran en cada render, los efectos del hook no terminarían.
  const unreadRef = { current: options.unread ?? [] }
  const readStateRef = { current: options.readState ?? {} }
  const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }
  const args = {
    enabled: options.enabled ?? true,
    router,
    unreadRef,
    readStateRef,
    commitUnread: vi.fn((next: PortalNotification[]) => {
      unreadRef.current = next
      return next
    }),
    publishStateToOtherTabs: vi.fn(),
    applyReadState: vi.fn((readState: Record<string, number>) => {
      readStateRef.current = { ...readStateRef.current, ...readState }
    }),
    resetPollInterval: vi.fn(),
  }
  const view = renderHook(() => usePortalNotificationActions(args as unknown as ActionsArgs))
  return { ...view, args, unreadRef, readStateRef, router }
}

/** Una promesa que se resuelve a mano, para probar lo que pasa con una llamada en vuelo. */
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.ackPortalNotificationAction.mockResolvedValue({ ok: true })
  mocks.markChatterConversationSeenAction.mockResolvedValue({ ok: true, readState: { 'task:5': 50 } })
  mocks.acknowledgeTramiteListItemSeenAction.mockResolvedValue({ ok: true })
})

describe('markConversationSeen', () => {
  it('desactivado no hace nada', async () => {
    const { result, args } = mount({ enabled: false, unread: [note()] })

    await result.current.markConversationSeen('task', 5, 50)

    expect(args.commitUnread).not.toHaveBeenCalled()
    expect(mocks.markChatterConversationSeenAction).not.toHaveBeenCalled()
  })

  it('quita el aviso al momento, guarda el visto y lo confirma en el servidor', async () => {
    const other = note({ recordId: 9, recordKind: 'ticket' })
    const { result, args, unreadRef } = mount({ unread: [note(), other] })

    await result.current.markConversationSeen('task', 5, 50)

    expect(unreadRef.current).toEqual([other])
    expect(args.applyReadState).toHaveBeenNthCalledWith(1, { 'task:5': 50 })
    expect(mocks.markChatterConversationSeenAction).toHaveBeenCalledWith({
      kind: 'task',
      recordId: 5,
      lastSeenMessageId: 50,
    })
    // Lo que devuelve el servidor se aplica y se vuelve a publicar.
    expect(args.applyReadState).toHaveBeenNthCalledWith(2, { 'task:5': 50 })
    expect(args.publishStateToOtherTabs).toHaveBeenCalledTimes(2)
    expect(args.publishStateToOtherTabs).toHaveBeenNthCalledWith(1, [other])
  })

  it('otros avisos del mismo registro (no de chatter) se conservan', async () => {
    const status = note({ reason: 'status_change' })
    const { result, unreadRef } = mount({ unread: [note(), status] })

    await result.current.markConversationSeen('task', 5, 50)

    expect(unreadRef.current).toEqual([status])
  })

  it('usa el mayor entre el mensaje visto y el último del aviso pendiente', async () => {
    const { result } = mount({ unread: [note({ latestMessageId: 80 })] })

    await result.current.markConversationSeen('task', 5, 50)

    expect(mocks.markChatterConversationSeenAction).toHaveBeenCalledWith(
      expect.objectContaining({ lastSeenMessageId: 80 })
    )
  })

  it('si el visto pedido es mayor que el del aviso, manda el pedido', async () => {
    const { result } = mount({ unread: [note({ latestMessageId: 20 })] })

    await result.current.markConversationSeen('task', 5, 50)

    expect(mocks.markChatterConversationSeenAction).toHaveBeenCalledWith(
      expect.objectContaining({ lastSeenMessageId: 50 })
    )
  })

  it('el aviso de otro registro no cuenta para el visto', async () => {
    const { result } = mount({ unread: [note({ recordId: 6, latestMessageId: 99 })] })

    await result.current.markConversationSeen('task', 5, 50)

    expect(mocks.markChatterConversationSeenAction).toHaveBeenCalledWith(
      expect.objectContaining({ lastSeenMessageId: 50 })
    )
  })

  it('si ya estaba visto, solo quita el aviso y lo publica, sin llamar al servidor', async () => {
    const { result, args, unreadRef } = mount({ unread: [note({ latestMessageId: 40 })], readState: { 'task:5': 50 } })

    await result.current.markConversationSeen('task', 5, 40)

    expect(unreadRef.current).toEqual([])
    expect(args.commitUnread).toHaveBeenCalled()
    expect(args.publishStateToOtherTabs).toHaveBeenCalledWith([])
    expect(mocks.markChatterConversationSeenAction).not.toHaveBeenCalled()
    expect(args.applyReadState).not.toHaveBeenCalled()
  })

  it('un visto igual al ya guardado cuenta como ya visto', async () => {
    const { result } = mount({ readState: { 'task:5': 50 } })

    await result.current.markConversationSeen('task', 5, 50)

    expect(mocks.markChatterConversationSeenAction).not.toHaveBeenCalled()
  })

  it('mientras hay una confirmación en vuelo del mismo registro no lanza otra, y luego sí', async () => {
    const first = deferred<{ ok: true; readState: Record<string, number> }>()
    mocks.markChatterConversationSeenAction.mockReturnValueOnce(first.promise)
    const { result } = mount()

    const pending = result.current.markConversationSeen('task', 5, 50)
    await result.current.markConversationSeen('task', 5, 60)
    expect(mocks.markChatterConversationSeenAction).toHaveBeenCalledTimes(1)

    first.resolve({ ok: true, readState: { 'task:5': 50 } })
    await pending
    await result.current.markConversationSeen('task', 5, 60)

    expect(mocks.markChatterConversationSeenAction).toHaveBeenCalledTimes(2)
  })

  it('un registro en vuelo no bloquea a otro registro', async () => {
    const first = deferred<{ ok: true; readState: Record<string, number> }>()
    mocks.markChatterConversationSeenAction.mockReturnValueOnce(first.promise)
    const { result } = mount()

    const pending = result.current.markConversationSeen('task', 5, 50)
    await result.current.markConversationSeen('ticket', 5, 50)

    expect(mocks.markChatterConversationSeenAction).toHaveBeenCalledTimes(2)
    first.resolve({ ok: true, readState: {} })
    await pending
  })

  it('si el servidor responde con error no aplica su estado y deja volver a intentar', async () => {
    mocks.markChatterConversationSeenAction.mockResolvedValueOnce({ ok: false, error: 'odoo_unavailable' })
    const { result, args } = mount()

    await result.current.markConversationSeen('task', 5, 50)

    // Solo el guardado optimista: no se aplica nada del servidor.
    expect(args.applyReadState).toHaveBeenCalledTimes(1)
    expect(args.publishStateToOtherTabs).toHaveBeenCalledTimes(1)

    await result.current.markConversationSeen('task', 5, 60)
    expect(mocks.markChatterConversationSeenAction).toHaveBeenCalledTimes(2)
  })

  it('si la llamada revienta, la clave se libera igualmente', async () => {
    mocks.markChatterConversationSeenAction.mockRejectedValueOnce(new Error('boom'))
    const { result } = mount()

    await expect(result.current.markConversationSeen('task', 5, 50)).rejects.toThrow('boom')
    await result.current.markConversationSeen('task', 5, 60)

    expect(mocks.markChatterConversationSeenAction).toHaveBeenCalledTimes(2)
  })
})

describe('ackStatusChangeSeen / ackAssigneeChangeSeen', () => {
  it('desactivado no hace nada', async () => {
    const { result, args } = mount({ enabled: false, unread: [note({ reason: 'status_change' })] })

    await result.current.ackStatusChangeSeen('tramite', 5)

    expect(args.commitUnread).not.toHaveBeenCalled()
    expect(mocks.ackPortalNotificationAction).not.toHaveBeenCalled()
  })

  it('quita solo el aviso de estado de ese registro, acorta el sondeo y lo confirma', async () => {
    const assignee = note({ reason: 'assignee_change' })
    const otherRecord = note({ recordId: 6, reason: 'status_change' })
    const { result, args, unreadRef } = mount({
      unread: [note({ reason: 'status_change' }), assignee, otherRecord],
    })

    await result.current.ackStatusChangeSeen('tramite', 5)

    expect(unreadRef.current).toEqual([assignee, otherRecord])
    expect(args.publishStateToOtherTabs).toHaveBeenCalledWith([assignee, otherRecord])
    expect(args.resetPollInterval).toHaveBeenCalled()
    expect(mocks.ackPortalNotificationAction).toHaveBeenCalledWith({
      scope: 'tramite',
      recordId: 5,
      reason: 'status_change',
    })
  })

  it('el aviso de responsable confirma con su propio motivo', async () => {
    const status = note({ reason: 'status_change' })
    const { result, unreadRef } = mount({ unread: [status, note({ reason: 'assignee_change' })] })

    await result.current.ackAssigneeChangeSeen('tramite', 5)

    expect(unreadRef.current).toEqual([status])
    expect(mocks.ackPortalNotificationAction).toHaveBeenCalledWith({
      scope: 'tramite',
      recordId: 5,
      reason: 'assignee_change',
    })
  })

  it('el mismo aviso en vuelo no se confirma dos veces, y luego sí', async () => {
    const first = deferred<{ ok: true }>()
    mocks.ackPortalNotificationAction.mockReturnValueOnce(first.promise)
    const { result } = mount()

    const pending = result.current.ackStatusChangeSeen('tramite', 5)
    await result.current.ackStatusChangeSeen('tramite', 5)
    expect(mocks.ackPortalNotificationAction).toHaveBeenCalledTimes(1)

    first.resolve({ ok: true })
    await pending
    await result.current.ackStatusChangeSeen('tramite', 5)

    expect(mocks.ackPortalNotificationAction).toHaveBeenCalledTimes(2)
  })

  it('el aviso de estado y el de responsable del mismo registro no se bloquean entre sí', async () => {
    const first = deferred<{ ok: true }>()
    mocks.ackPortalNotificationAction.mockReturnValueOnce(first.promise)
    const { result } = mount()

    const pending = result.current.ackStatusChangeSeen('tramite', 5)
    await result.current.ackAssigneeChangeSeen('tramite', 5)

    expect(mocks.ackPortalNotificationAction).toHaveBeenCalledTimes(2)
    first.resolve({ ok: true })
    await pending
  })

  it('un fallo del servidor no rompe nada y libera la clave', async () => {
    mocks.ackPortalNotificationAction.mockRejectedValueOnce(new Error('boom'))
    const { result } = mount()

    await expect(result.current.ackStatusChangeSeen('tramite', 5)).resolves.toBeUndefined()
    await result.current.ackStatusChangeSeen('tramite', 5)

    expect(mocks.ackPortalNotificationAction).toHaveBeenCalledTimes(2)
  })
})

describe('dismissNewTramiteNotification', () => {
  it('quita solo el aviso de trámite nuevo de ese registro y lo publica', () => {
    const chatter = note({ reason: 'unread_chatter' })
    const other = note({ recordId: 6, reason: 'new_tramite' })
    const { result, args, unreadRef } = mount({ unread: [note({ reason: 'new_tramite' }), chatter, other] })

    result.current.dismissNewTramiteNotification('task', 5)

    expect(unreadRef.current).toEqual([chatter, other])
    expect(args.publishStateToOtherTabs).toHaveBeenCalledWith([chatter, other])
  })
})

describe('dismissNotification', () => {
  it('un mensaje sin leer se descarta dejando constancia de «visto» en el servidor', async () => {
    const { result, unreadRef, args } = mount({ unread: [note({ latestMessageId: 70 })] })

    result.current.dismissNotification(note({ latestMessageId: 70 }))
    await vi.waitFor(() => expect(mocks.markChatterConversationSeenAction).toHaveBeenCalled())

    expect(mocks.markChatterConversationSeenAction).toHaveBeenCalledWith({
      kind: 'task',
      recordId: 5,
      lastSeenMessageId: 70,
    })
    expect(unreadRef.current).toEqual([])
    // Una sola vía: la de «visto». No pasa además por el quitar-y-confirmar de los demás avisos.
    expect(args.commitUnread).toHaveBeenCalledTimes(1)
    expect(mocks.ackPortalNotificationAction).not.toHaveBeenCalled()
  })

  it('un mensaje sin leer sin tipo de registro solo se quita de la lista', () => {
    const item = note({ recordKind: undefined })
    const { result, unreadRef } = mount({ unread: [item] })

    result.current.dismissNotification(item)

    expect(unreadRef.current).toEqual([])
    expect(mocks.markChatterConversationSeenAction).not.toHaveBeenCalled()
    expect(mocks.ackPortalNotificationAction).not.toHaveBeenCalled()
  })

  it('un trámite nuevo avisa a la lista de «visto» además de al servidor', () => {
    const item = note({ reason: 'new_tramite', recordKind: undefined, listKind: 'consulta', recordId: 12 })
    const { result, unreadRef } = mount({ unread: [item] })

    result.current.dismissNotification(item)

    expect(mocks.acknowledgeTramiteListItemSeenAction).toHaveBeenCalledWith('consulta-12')
    expect(mocks.dispatchTramitesListItemSeen).toHaveBeenCalledWith('consulta-12')
    expect(unreadRef.current).toEqual([])
    expect(mocks.ackPortalNotificationAction).not.toHaveBeenCalled()
  })

  it('un trámite nuevo sin tipo de lista solo se quita', () => {
    const item = note({ reason: 'new_tramite', recordKind: undefined, listKind: undefined })
    const { result, unreadRef } = mount({ unread: [item] })

    result.current.dismissNotification(item)

    expect(mocks.acknowledgeTramiteListItemSeenAction).not.toHaveBeenCalled()
    expect(unreadRef.current).toEqual([])
  })

  it.each(['status_change', 'assignee_change', 'new_firma', 'firma_due_soon'] as const)(
    'un aviso de %s se quita y se confirma en el servidor',
    (reason) => {
      const item = note({ reason, scope: reason.includes('firma') ? 'firma' : 'tramite', recordKind: undefined })
      const { result, unreadRef, args } = mount({ unread: [item] })

      result.current.dismissNotification(item)

      expect(unreadRef.current).toEqual([])
      expect(args.publishStateToOtherTabs).toHaveBeenCalled()
      expect(mocks.ackPortalNotificationAction).toHaveBeenCalledWith({
        scope: item.scope,
        recordId: 5,
        reason,
      })
    }
  )

  it('descartar todos recorre una copia y deja la lista vacía', async () => {
    const a = note({ reason: 'status_change' })
    const b = note({ recordId: 6, reason: 'new_firma', scope: 'firma', recordKind: undefined })
    const c = note({ recordId: 7, latestMessageId: 9, recordKind: 'ticket' })
    const { result, unreadRef } = mount({ unread: [a, b, c] })

    result.current.dismissAllNotifications()
    await vi.waitFor(() => expect(mocks.markChatterConversationSeenAction).toHaveBeenCalled())

    expect(unreadRef.current).toEqual([])
    expect(mocks.ackPortalNotificationAction).toHaveBeenCalledTimes(2)
    expect(mocks.markChatterConversationSeenAction).toHaveBeenCalledWith({
      kind: 'ticket',
      recordId: 7,
      lastSeenMessageId: 9,
    })
  })
})

describe('openNotification', () => {
  it('una firma abre /firmas y se confirma', () => {
    // Con tipo de lista a propósito: una firma no debe seguir hacia la apertura de un trámite.
    const item = note({ scope: 'firma', reason: 'new_firma', recordKind: undefined, listKind: 'tramite' })
    const { result, router, unreadRef } = mount({ unread: [item] })

    result.current.openNotification(item)

    expect(router.push).toHaveBeenCalledTimes(1)
    expect(router.push).toHaveBeenCalledWith('/firmas')
    expect(unreadRef.current).toEqual([])
    expect(mocks.ackPortalNotificationAction).toHaveBeenCalled()
    expect(mocks.openPortalUrl).not.toHaveBeenCalled()
  })

  it('una obligación abre su pestaña de documentos', () => {
    const item = note({ scope: 'obligacion', recordId: 7, reason: 'status_change', recordKind: undefined, listKind: undefined })
    const { result, router } = mount({ unread: [item] })

    result.current.openNotification(item)

    expect(mocks.openPortalUrl).toHaveBeenCalledWith(router, '/obligaciones?open=task-7&tab=documents')
    expect(router.push).not.toHaveBeenCalled()
  })

  it('un trámite nuevo se abre pidiendo la página al servidor', () => {
    const item = note({ reason: 'new_tramite', recordId: 5, listKind: 'tramite' })
    const { result, router } = mount({ unread: [item] })

    result.current.openNotification(item)

    expect(router.push).toHaveBeenCalledWith('/tramites?open=tramite-5&tab=conversation')
    expect(mocks.openPortalUrl).not.toHaveBeenCalled()
  })

  it('un aviso de un trámite que ya existe se abre sin ir al servidor', () => {
    const item = note({ reason: 'unread_chatter', recordId: 5, listKind: 'consulta' })
    const { result, router } = mount({ unread: [item] })

    result.current.openNotification(item)

    expect(mocks.openPortalUrl).toHaveBeenCalledWith(router, '/tramites?open=consulta-5&tab=conversation')
    expect(router.push).not.toHaveBeenCalled()
  })

  it('un aviso sin tipo de lista (ni firma ni obligación) solo se quita', () => {
    const item = note({ listKind: undefined, reason: 'unread_chatter' })
    const { result, router, unreadRef } = mount({ unread: [item] })

    result.current.openNotification(item)

    expect(unreadRef.current).toEqual([])
    expect(router.push).not.toHaveBeenCalled()
    expect(mocks.openPortalUrl).not.toHaveBeenCalled()
  })

  it('abrir un mensaje sin leer no lo confirma como los avisos de estado', () => {
    const item = note({ reason: 'unread_chatter' })
    const { result } = mount({ unread: [item] })

    result.current.openNotification(item)

    expect(mocks.ackPortalNotificationAction).not.toHaveBeenCalled()
  })

  it('quita de la lista solo el aviso abierto (mismo registro y motivo)', () => {
    const open = note({ reason: 'status_change' })
    const sameRecordOtherReason = note({ reason: 'assignee_change' })
    const sameReasonOtherRecord = note({ recordId: 6, reason: 'status_change' })
    const { result, unreadRef } = mount({
      unread: [open, sameRecordOtherReason, sameReasonOtherRecord],
    })

    result.current.openNotification(open)

    expect(unreadRef.current).toEqual([sameRecordOtherReason, sameReasonOtherRecord])
  })
})

// @vitest-environment jsdom
// Plantilla para probar hooks de React: `renderHook` de @testing-library/react en jsdom (la
// directiva de arriba lo activa solo en este archivo; el resto de tests sigue en `node`). Los
// archivos son `.test.ts` (sin JSX) para que los recoja `vitest.config.ts`. Las referencias y
// callbacks que se pasan al hook deben ser estables entre renders, o sus efectos no terminan.
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { fetchNewerRecordMessages, fetchRecordDrawerBundle } = vi.hoisted(() => ({
  fetchNewerRecordMessages: vi.fn(),
  fetchRecordDrawerBundle: vi.fn(),
}))

vi.mock('@/src/modules/portal/ui/portal-read-api', () => ({
  fetchNewerRecordMessages,
  fetchOlderRecordMessages: vi.fn(),
  fetchRecordDrawerBundle,
}))

import type { PortalChatterMessage } from '@/src/modules/portal/domain/portal-chatter-types'
import { useChatterMessages } from '@/src/modules/portal/ui/use-chatter-messages'
import { writeDrawerMessages } from '@/src/modules/portal/ui/record-drawer-bundle'

const KIND = 'task' as const

const message = (id: number, files = 0): PortalChatterMessage =>
  ({
    id,
    bodyHtml: '<p>Hola</p>',
    date: '2026-10-28T10:00:00Z',
    authorName: 'Gestor',
    isFromClient: false,
    ...(files
      ? { attachments: Array.from({ length: files }, (_, index) => ({ id: id * 100 + index, name: 'a.pdf' })) }
      : {}),
  }) as PortalChatterMessage

/** Deja guardada una conversación fresca para que el hook arranque con ella sin pedir nada. */
function seedChat(recordId: number, messages: PortalChatterMessage[]) {
  writeDrawerMessages(KIND, recordId, { messages, hasMore: false })
}

function renderChat(
  recordId: number,
  props: {
    recordId?: number
    active?: boolean
    markReadOnView?: boolean
    onConversationViewed?: (latestMessageId: number) => void
    latestKnownMessageId?: number
    onIncomingAttachments?: (count: number) => void
  } = {}
) {
  // Referencias estables: si cambiaran en cada render, los efectos del hook se relanzarían sin fin.
  const scrollRef = { current: null }
  const shouldStickToBottomRef = { current: true }
  const resetComposerState = vi.fn()
  return renderHook(
    (current: typeof props) =>
      useChatterMessages({
        kind: KIND,
        recordId: current.recordId ?? recordId,
        active: true,
        markReadOnView: false,
        lastSeenMessageIdBeforeOpen: 0,
        notifications: null,
        scrollRef,
        shouldStickToBottomRef,
        resetComposerState,
        ...current,
      }),
    { initialProps: props }
  )
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('useChatterMessages: adjuntos de mensajes que llegan con el chat abierto', () => {
  it('avisa con el número de adjuntos de los mensajes nuevos', async () => {
    seedChat(101, [message(1), message(2)])
    fetchNewerRecordMessages.mockResolvedValue({ ok: true, messages: [message(3, 2), message(4, 1)] })
    const onIncomingAttachments = vi.fn()

    const { result } = renderChat(101, { latestKnownMessageId: 4, onIncomingAttachments })

    await waitFor(() => expect(onIncomingAttachments).toHaveBeenCalledTimes(1))
    expect(onIncomingAttachments).toHaveBeenCalledWith(3)
    expect(fetchNewerRecordMessages).toHaveBeenCalledWith(KIND, 101, 2)
    await waitFor(() => expect(result.current.messages.map((m) => m.id)).toEqual([1, 2, 3, 4]))
  })

  it('no avisa si los mensajes nuevos no traen adjuntos', async () => {
    seedChat(102, [message(1)])
    fetchNewerRecordMessages.mockResolvedValue({ ok: true, messages: [message(2)] })
    const onIncomingAttachments = vi.fn()

    const { result } = renderChat(102, { latestKnownMessageId: 2, onIncomingAttachments })

    await waitFor(() => expect(result.current.messages.map((m) => m.id)).toEqual([1, 2]))
    expect(onIncomingAttachments).not.toHaveBeenCalled()
  })

  it('un mensaje que el chat ya tenía (el propio recién enviado) no suma otra vez', async () => {
    seedChat(103, [message(1), message(2, 1)])
    fetchNewerRecordMessages.mockResolvedValue({ ok: true, messages: [message(2, 1)] })
    const onIncomingAttachments = vi.fn()

    const { result } = renderChat(103, { onIncomingAttachments })
    await waitFor(() => expect(result.current.messages).toHaveLength(2))

    await act(async () => {
      await result.current.syncAfterOwnMessage()
    })

    expect(fetchNewerRecordMessages).toHaveBeenCalled()
    expect(onIncomingAttachments).not.toHaveBeenCalled()
  })

  it('usa el aviso más reciente, no el del primer render', async () => {
    seedChat(105, [message(1)])
    fetchNewerRecordMessages.mockResolvedValue({ ok: true, messages: [message(2, 1)] })
    const first = vi.fn()
    const latest = vi.fn()

    const { rerender } = renderChat(105, { onIncomingAttachments: first })
    rerender({ latestKnownMessageId: 2, onIncomingAttachments: latest })

    await waitFor(() => expect(latest).toHaveBeenCalledWith(1))
    expect(first).not.toHaveBeenCalled()
  })

  it('un fallo al pedir lo nuevo no avisa ni rompe el chat', async () => {
    seedChat(104, [message(1)])
    fetchNewerRecordMessages.mockResolvedValue({ ok: false, error: 'odoo_unavailable' })
    const onIncomingAttachments = vi.fn()

    const { result } = renderChat(104, { latestKnownMessageId: 2, onIncomingAttachments })

    await waitFor(() => expect(fetchNewerRecordMessages).toHaveBeenCalled())
    expect(onIncomingAttachments).not.toHaveBeenCalled()
    expect(result.current.messages.map((m) => m.id)).toEqual([1])
  })
})

describe('useChatterMessages: «visto» de la conversación', () => {
  it('con una conversación guardada, avisa del último mensaje al abrirla', async () => {
    seedChat(201, [message(1), message(2), message(3)])
    const onConversationViewed = vi.fn()

    renderChat(201, { markReadOnView: true, onConversationViewed })

    await waitFor(() => expect(onConversationViewed).toHaveBeenCalledWith(3))
    expect(onConversationViewed).toHaveBeenCalledTimes(1)
  })

  it('sin guardar, avisa cuando el servidor devuelve la conversación', async () => {
    fetchRecordDrawerBundle.mockResolvedValue({
      ok: true,
      messages: [message(10), message(11)],
      hasMore: false,
      description: '',
    })
    const onConversationViewed = vi.fn()

    renderChat(202, { markReadOnView: true, onConversationViewed })

    await waitFor(() => expect(onConversationViewed).toHaveBeenCalledWith(11))
    expect(onConversationViewed).toHaveBeenCalledTimes(1)
  })

  it('si la carga falla no avisa de «visto»', async () => {
    fetchRecordDrawerBundle.mockResolvedValue({ ok: false, error: 'odoo_unavailable' })
    const onConversationViewed = vi.fn()

    const { result } = renderChat(203, { markReadOnView: true, onConversationViewed })

    await waitFor(() => expect(result.current.error).not.toBeNull())
    expect(onConversationViewed).not.toHaveBeenCalled()
  })

  it('sin markReadOnView no avisa nunca', async () => {
    seedChat(204, [message(1), message(2)])
    const onConversationViewed = vi.fn()

    const { result } = renderChat(204, { markReadOnView: false, onConversationViewed })

    await waitFor(() => expect(result.current.messages).toHaveLength(2))
    expect(onConversationViewed).not.toHaveBeenCalled()
  })

  it('con el chat inactivo (otra pestaña del drawer) ni carga ni avisa', async () => {
    seedChat(205, [message(1)])
    const onConversationViewed = vi.fn()

    renderChat(205, { active: false, markReadOnView: true, onConversationViewed })
    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(onConversationViewed).not.toHaveBeenCalled()
    expect(fetchRecordDrawerBundle).not.toHaveBeenCalled()
  })

  it('un mensaje nuevo con el chat abierto avisa otra vez con su id, sin repetir el anterior', async () => {
    seedChat(206, [message(1), message(2)])
    fetchNewerRecordMessages.mockResolvedValue({ ok: true, messages: [message(3)] })
    const onConversationViewed = vi.fn()

    const { rerender, result } = renderChat(206, { markReadOnView: true, onConversationViewed })
    await waitFor(() => expect(onConversationViewed).toHaveBeenCalledWith(2))

    rerender({ markReadOnView: true, onConversationViewed, latestKnownMessageId: 3 })

    await waitFor(() => expect(onConversationViewed).toHaveBeenCalledWith(3))
    await waitFor(() => expect(result.current.messages).toHaveLength(3))
    expect(onConversationViewed.mock.calls.map(([id]) => id)).toEqual([2, 3])
  })

  it('cambiar el callback no repite un aviso ya dado', async () => {
    seedChat(207, [message(1), message(2)])
    const first = vi.fn()
    const second = vi.fn()

    const { rerender } = renderChat(207, { markReadOnView: true, onConversationViewed: first })
    await waitFor(() => expect(first).toHaveBeenCalledWith(2))
    rerender({ markReadOnView: true, onConversationViewed: second })
    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(first).toHaveBeenCalledTimes(1)
    expect(second).not.toHaveBeenCalled()
  })

  it('los avisos posteriores usan el callback más reciente', async () => {
    seedChat(208, [message(1)])
    fetchNewerRecordMessages.mockResolvedValue({ ok: true, messages: [message(2)] })
    const first = vi.fn()
    const latest = vi.fn()

    const { rerender } = renderChat(208, { markReadOnView: true, onConversationViewed: first })
    await waitFor(() => expect(first).toHaveBeenCalledWith(1))
    rerender({ markReadOnView: true, onConversationViewed: latest, latestKnownMessageId: 2 })

    await waitFor(() => expect(latest).toHaveBeenCalledWith(2))
    expect(first).toHaveBeenCalledTimes(1)
  })

  it('al cambiar de registro avisa del último mensaje del nuevo aunque su id sea menor', async () => {
    seedChat(209, [message(50)])
    seedChat(210, [message(3)])
    const onConversationViewed = vi.fn()

    const { rerender } = renderChat(209, { markReadOnView: true, onConversationViewed })
    await waitFor(() => expect(onConversationViewed).toHaveBeenCalledWith(50))
    rerender({ recordId: 210, markReadOnView: true, onConversationViewed })

    await waitFor(() => expect(onConversationViewed).toHaveBeenCalledWith(3))
  })

  it('si el chat guardado va por detrás del aviso, el «visto» espera al mensaje nuevo ya pintado', async () => {
    seedChat(211, [message(1)])
    fetchNewerRecordMessages.mockResolvedValue({ ok: true, messages: [message(2)] })
    const onConversationViewed = vi.fn()

    renderChat(211, { markReadOnView: true, onConversationViewed, latestKnownMessageId: 2 })

    await waitFor(() => expect(onConversationViewed).toHaveBeenCalledWith(2))
    expect(onConversationViewed).not.toHaveBeenCalledWith(1)
  })

  it('un chat vacío no avisa', async () => {
    fetchRecordDrawerBundle.mockResolvedValue({ ok: true, messages: [], hasMore: false, description: '' })
    const onConversationViewed = vi.fn()

    const { result } = renderChat(212, { markReadOnView: true, onConversationViewed })

    await waitFor(() => expect(fetchRecordDrawerBundle).toHaveBeenCalled())
    await waitFor(() => expect(result.current.loadingInitial).toBe(false))
    expect(onConversationViewed).not.toHaveBeenCalled()
  })
})

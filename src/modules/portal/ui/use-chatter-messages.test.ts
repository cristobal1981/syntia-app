// @vitest-environment jsdom
// Plantilla para probar hooks de React: `renderHook` de @testing-library/react en jsdom (la
// directiva de arriba lo activa solo en este archivo; el resto de tests sigue en `node`). Los
// archivos son `.test.ts` (sin JSX) para que los recoja `vitest.config.ts`. Las referencias y
// callbacks que se pasan al hook deben ser estables entre renders, o sus efectos no terminan.
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { fetchNewerRecordMessages } = vi.hoisted(() => ({ fetchNewerRecordMessages: vi.fn() }))

vi.mock('@/src/modules/portal/ui/portal-read-api', () => ({
  fetchNewerRecordMessages,
  fetchOlderRecordMessages: vi.fn(),
  fetchRecordDrawerBundle: vi.fn(),
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
  props: { latestKnownMessageId?: number; onIncomingAttachments?: (count: number) => void } = {}
) {
  // Referencias estables: si cambiaran en cada render, los efectos del hook se relanzarían sin fin.
  const scrollRef = { current: null }
  const shouldStickToBottomRef = { current: true }
  const resetComposerState = vi.fn()
  return renderHook(
    (current: typeof props) =>
      useChatterMessages({
        kind: KIND,
        recordId,
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

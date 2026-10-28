import { describe, expect, it } from 'vitest'

import {
  countAttachmentsInNewMessages,
  mergeChatterMessages,
} from '@/src/modules/portal/domain/merge-chatter-messages'
import type { PortalChatterMessage } from '@/src/modules/portal/domain/portal-chatter-types'

const msg = (id: number) => ({ id }) as PortalChatterMessage
const ids = (messages: PortalChatterMessage[]) => messages.map((message) => message.id)

describe('mergeChatterMessages', () => {
  it('añade los nuevos al final cuando son posteriores', () => {
    expect(ids(mergeChatterMessages([msg(1), msg(2)], [msg(3)]))).toEqual([1, 2, 3])
  })

  it('coloca por id un mensaje anterior que llega después del propio', () => {
    expect(ids(mergeChatterMessages([msg(5), msg(9)], [msg(7)]))).toEqual([5, 7, 9])
  })

  it('no duplica los que ya están', () => {
    expect(ids(mergeChatterMessages([msg(1), msg(2)], [msg(2), msg(3)]))).toEqual([1, 2, 3])
  })

  it('devuelve el mismo array si no hay nada nuevo', () => {
    const current = [msg(1), msg(2)]
    expect(mergeChatterMessages(current, [msg(2)])).toBe(current)
    expect(mergeChatterMessages(current, [])).toBe(current)
  })
})

describe('countAttachmentsInNewMessages', () => {
  const withFiles = (id: number, files: number) =>
    ({
      id,
      attachments: Array.from({ length: files }, (_, index) => ({ id: id * 100 + index, name: 'a.pdf' })),
    }) as PortalChatterMessage

  it('suma los adjuntos de los mensajes que el chat aún no tenía', () => {
    expect(countAttachmentsInNewMessages([withFiles(5, 2), withFiles(6, 1)], new Set([1, 2]))).toBe(3)
  })

  it('un mensaje ya presente (p. ej. el propio recién enviado) no suma', () => {
    expect(countAttachmentsInNewMessages([withFiles(5, 2), withFiles(6, 1)], new Set([5]))).toBe(1)
  })

  it('un mensaje repetido en la misma tanda se cuenta una vez', () => {
    expect(countAttachmentsInNewMessages([withFiles(5, 2), withFiles(5, 2)], new Set())).toBe(2)
  })

  it('mensajes sin adjuntos o con la lista vacía suman cero', () => {
    expect(countAttachmentsInNewMessages([msg(5), withFiles(6, 0)], new Set())).toBe(0)
    expect(countAttachmentsInNewMessages([], new Set())).toBe(0)
  })
})

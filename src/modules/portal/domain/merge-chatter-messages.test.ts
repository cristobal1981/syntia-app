import { describe, expect, it } from 'vitest'

import { mergeChatterMessages } from '@/src/modules/portal/domain/merge-chatter-messages'
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

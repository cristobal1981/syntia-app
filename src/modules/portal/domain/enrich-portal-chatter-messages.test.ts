import { describe, expect, it } from 'vitest'

import { portalChatter } from '@/content/portal-chatter'
import { enrichPortalChatterMessages } from '@/src/modules/portal/domain/enrich-portal-chatter-messages'
import type { PortalChatterMessage } from '@/src/modules/portal/domain/portal-chatter-types'

function message(overrides: Partial<PortalChatterMessage>): PortalChatterMessage {
  return {
    id: 1,
    bodyHtml: '<p>hola</p>',
    date: '2026-01-01 10:00:00',
    authorName: 'Asesor',
    isFromClient: false,
    ...overrides,
  }
}

describe('enrichPortalChatterMessages', () => {
  it('leaves a message with no parentId untouched', () => {
    const msgs = [message({ id: 1, isFromClient: true })]
    expect(enrichPortalChatterMessages(msgs)).toEqual(msgs)
  })

  it('leaves a message untouched if it already has a parentPreview', () => {
    const existingPreview = { authorName: 'Alguien', snippet: 'ya resuelto' }
    const msgs = [
      message({ id: 1, authorName: 'Cliente', isFromClient: true }),
      message({
        id: 2,
        isFromClient: true,
        parentId: 1,
        parentPreview: existingPreview,
      }),
    ]
    const result = enrichPortalChatterMessages(msgs)
    expect(result[1].parentPreview).toBe(existingPreview)
  })

  it('does NOT attach a parentPreview to an advisor message, even if parentId resolves (Odoo auto-chains parent_id for email threading, not an explicit reply)', () => {
    const msgs = [
      message({ id: 1, authorName: 'Cliente', isFromClient: true }),
      message({ id: 2, isFromClient: false, parentId: 1 }),
    ]
    const result = enrichPortalChatterMessages(msgs)
    expect(result[1].parentPreview).toBeUndefined()
  })

  it('attaches a parentPreview to a client message whose parentId resolves to an existing message', () => {
    const msgs = [
      message({ id: 1, authorName: 'Asesor', isFromClient: false, bodyHtml: '<p>Hola, dime</p>' }),
      message({ id: 2, isFromClient: true, parentId: 1 }),
    ]
    const result = enrichPortalChatterMessages(msgs)
    expect(result[1].parentPreview).toEqual({
      authorName: 'Asesor',
      snippet: 'Hola, dime',
    })
  })

  it('uses the "you" label for the preview author when the parent message is itself from the client', () => {
    const msgs = [
      message({ id: 1, authorName: 'Cliente', isFromClient: true, bodyHtml: '<p>mi primer mensaje</p>' }),
      message({ id: 2, isFromClient: true, parentId: 1 }),
    ]
    const result = enrichPortalChatterMessages(msgs)
    expect(result[1].parentPreview?.authorName).toBe(portalChatter.youLabel)
  })

  it('leaves a client message untouched if its parentId does not resolve to any message in the list (filtered-out internal log)', () => {
    const msgs = [message({ id: 2, isFromClient: true, parentId: 999 })]
    const result = enrichPortalChatterMessages(msgs)
    expect(result[0].parentPreview).toBeUndefined()
    expect(result[0].parentId).toBe(999)
  })

  it('does not mutate the input array', () => {
    const msgs = [
      message({ id: 1, authorName: 'Asesor', isFromClient: false }),
      message({ id: 2, isFromClient: true, parentId: 1 }),
    ]
    enrichPortalChatterMessages(msgs)
    expect(msgs[1].parentPreview).toBeUndefined()
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'

const sanitize = vi.hoisted(() => vi.fn())
vi.mock('dompurify', () => ({ default: { sanitize } }))

import { prepareChatterHtmlForDisplay } from '@/src/modules/portal/ui/sanitize-chatter-html.client'

describe('prepareChatterHtmlForDisplay (client, DOMPurify config)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    sanitize.mockImplementation((html: string) => `S:${html}`)
  })

  it('passes the normalized body to DOMPurify with the same tag whitelist as the server', () => {
    const out = prepareChatterHtmlForDisplay('a<br/>b')
    expect(out).toBe('S:a<br>b')
    const [, config] = sanitize.mock.calls[0]
    expect([...config.ALLOWED_TAGS].sort()).toEqual(
      ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'ul', 'ol', 'li', 'a'].sort()
    )
  })

  it('only allows href, target and rel attributes (no style/on*/src)', () => {
    prepareChatterHtmlForDisplay('<p>x</p>')
    const [, config] = sanitize.mock.calls[0]
    expect([...config.ALLOWED_ATTR].sort()).toEqual(['href', 'rel', 'target'])
  })

  it('collapses </p> <p> before sanitizing, like the server', () => {
    prepareChatterHtmlForDisplay('<p>uno</p>  <p class="x">dos</p>')
    expect(sanitize.mock.calls[0][0]).toBe('<p>uno</p><p>dos</p>')
  })
})

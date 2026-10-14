import { describe, expect, it } from 'vitest'

import { escapeHtml } from '@/src/modules/email/domain/escape-html'

describe('escapeHtml', () => {
  it('escapa & < > " y \'', () => {
    expect(escapeHtml(`<a href="x">Tom & 'Jerry'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;Tom &amp; &#39;Jerry&#39;&lt;/a&gt;'
    )
  })

  it('escapa el & primero: no escapa dos veces las entidades que genera', () => {
    expect(escapeHtml('<')).toBe('&lt;')
    expect(escapeHtml('&lt;')).toBe('&amp;lt;')
  })

  it('deja intacto el texto sin caracteres especiales (incluidos tildes y ñ)', () => {
    expect(escapeHtml('Asesoría Ñandú 123')).toBe('Asesoría Ñandú 123')
  })

  it('cadena vacía', () => {
    expect(escapeHtml('')).toBe('')
  })
})

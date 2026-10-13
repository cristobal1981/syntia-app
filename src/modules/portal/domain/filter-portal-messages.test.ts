import { describe, expect, it } from 'vitest'

import {
  filterOdooMailMessageRows,
  formatChatterBodyFromOdoo,
  hasVisibleMessageBody,
  isChatterHtmlEmpty,
  isClientChatterAuthor,
  isExcludedChatterAuthor,
  stripHtmlToText,
  type OdooMailMessageRow,
  validateChatterHtmlBody,
} from '@/src/modules/portal/domain/filter-portal-messages'

describe('stripHtmlToText', () => {
  it('converts <br> and </p> to newlines and strips remaining tags', () => {
    expect(stripHtmlToText('<p>Hola<br>mundo</p>')).toBe('Hola\nmundo')
  })

  it('decodes common HTML entities', () => {
    expect(stripHtmlToText('A &amp; B &lt;tag&gt; &#39;q&#39; &quot;q&quot; &nbsp;x')).toBe(
      "A & B <tag> 'q' \"q\"  x"
    )
  })

  it('collapses 3+ consecutive newlines down to 2', () => {
    expect(stripHtmlToText('<p>a</p><p></p><p></p><p>b</p>')).toBe('a\n\n\nb'.replace(/\n{3,}/, '\n\n'))
  })
})

describe('formatChatterBodyFromOdoo / isChatterHtmlEmpty', () => {
  it('formats a plain Odoo body into display-ready, sanitized HTML', () => {
    expect(formatChatterBodyFromOdoo('<p>Hola</p>')).toBe('<p>Hola</p>')
  })

  it('treats an empty body as empty', () => {
    expect(isChatterHtmlEmpty('<p></p>')).toBe(true)
  })

  it('treats whitespace-only body as empty', () => {
    expect(isChatterHtmlEmpty('<p>   </p>')).toBe(true)
  })

  it('treats a body with real text as non-empty', () => {
    expect(isChatterHtmlEmpty('<p>hola</p>')).toBe(false)
  })
})

describe('validateChatterHtmlBody', () => {
  it('rejects an empty message (no visible text)', () => {
    expect(validateChatterHtmlBody('<p></p>', 500)).toEqual({ ok: false })
  })

  it('rejects a message whose visible text exceeds maxLength', () => {
    expect(validateChatterHtmlBody('<p>12345</p>', 4)).toEqual({ ok: false })
  })

  it('accepts a message exactly at maxLength (inclusive boundary)', () => {
    const result = validateChatterHtmlBody('<p>1234</p>', 4)
    expect(result.ok).toBe(true)
  })

  it('returns the sanitized HTML as `value` on success', () => {
    const result = validateChatterHtmlBody('<p onclick="x">hola</p>', 100)
    expect(result).toEqual({ ok: true, value: expect.any(String) })
    if (result.ok) {
      expect(result.value).not.toContain('onclick')
    }
  })
})

describe('hasVisibleMessageBody', () => {
  it('returns false for false/null/undefined', () => {
    expect(hasVisibleMessageBody(false)).toBe(false)
    expect(hasVisibleMessageBody(null)).toBe(false)
    expect(hasVisibleMessageBody(undefined)).toBe(false)
  })

  it('returns false for a non-empty string that has no visible text once tags are stripped', () => {
    expect(hasVisibleMessageBody('<p>   </p>')).toBe(false)
  })

  it('returns true for a string with real visible text', () => {
    expect(hasVisibleMessageBody('<p>hola</p>')).toBe(true)
  })
})

describe('isExcludedChatterAuthor', () => {
  it('excludes (returns true) when authorId is undefined — fail-closed, no author means not shown to the client', () => {
    expect(isExcludedChatterAuthor(undefined, [])).toBe(true)
  })

  it('excludes when authorId is 0 (falsy)', () => {
    expect(isExcludedChatterAuthor(0, [])).toBe(true)
  })

  it('excludes when authorId is in the excluded list', () => {
    expect(isExcludedChatterAuthor(5, [5, 6])).toBe(true)
  })

  it('does NOT exclude a real authorId that is not in the excluded list', () => {
    expect(isExcludedChatterAuthor(5, [6, 7])).toBe(false)
  })
})

describe('isClientChatterAuthor', () => {
  it('returns true only for an exact match with the client partner id', () => {
    expect(isClientChatterAuthor(10, 10)).toBe(true)
    expect(isClientChatterAuthor(10, 11)).toBe(false)
  })

  it('returns false when authorId is undefined', () => {
    expect(isClientChatterAuthor(undefined, 10)).toBe(false)
  })
})

describe('filterOdooMailMessageRows', () => {
  const baseOptions = { clientPartnerId: 10, excludedPartnerIds: [99] }

  function row(overrides: Partial<OdooMailMessageRow>): OdooMailMessageRow {
    return {
      id: 1,
      body: '<p>contenido</p>',
      author_id: [1, 'Alguien'],
      message_type: 'comment',
      ...overrides,
    }
  }

  it('keeps a normal comment with a visible body from a non-excluded author', () => {
    expect(filterOdooMailMessageRows([row({})], baseOptions)).toHaveLength(1)
  })

  it('drops a row with no visible body and no attachments', () => {
    expect(
      filterOdooMailMessageRows([row({ body: false, attachment_ids: false })], baseOptions)
    ).toHaveLength(0)
  })

  it('keeps a row with no visible body IF it has attachments', () => {
    expect(
      filterOdooMailMessageRows([row({ body: false, attachment_ids: [1, 2] })], baseOptions)
    ).toHaveLength(1)
  })

  it('drops a row authored by an excluded partner id', () => {
    expect(
      filterOdooMailMessageRows([row({ author_id: [99, 'Excluido'] })], baseOptions)
    ).toHaveLength(0)
  })

  it('drops a row with no author_id at all (fail-closed)', () => {
    expect(filterOdooMailMessageRows([row({ author_id: false })], baseOptions)).toHaveLength(0)
  })

  it('keeps "email" message_type alongside "comment"', () => {
    expect(
      filterOdooMailMessageRows([row({ message_type: 'email' })], baseOptions)
    ).toHaveLength(1)
  })

  it('drops a row whose message_type is neither "comment" nor "email" (e.g. internal "notification" log)', () => {
    expect(
      filterOdooMailMessageRows([row({ message_type: 'notification' })], baseOptions)
    ).toHaveLength(0)
  })

  it('keeps a row with no message_type at all (undefined is not filtered)', () => {
    expect(
      filterOdooMailMessageRows([row({ message_type: false })], baseOptions)
    ).toHaveLength(1)
  })
})

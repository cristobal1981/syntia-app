import { describe, expect, it } from 'vitest'

import {
  prepareChatterHtmlForDisplay,
  sanitizeChatterHtml,
} from '@/src/modules/portal/domain/sanitize-chatter-html.server'

describe('sanitizeChatterHtml — XSS-sensitive, security behavior', () => {
  it('strips <script>...</script> blocks entirely, including their content', () => {
    expect(sanitizeChatterHtml('<p>hola</p><script>alert(1)</script>')).toBe('<p>hola</p>')
  })

  it('strips <style>...</style> blocks entirely, including their content', () => {
    expect(sanitizeChatterHtml('<style>body{color:red}</style><p>hola</p>')).toBe('<p>hola</p>')
  })

  it('keeps allowed tags but drops every attribute on them (e.g. onclick, class)', () => {
    expect(sanitizeChatterHtml('<p onclick="alert(1)" class="x">hola</p>')).toBe('<p>hola</p>')
    expect(sanitizeChatterHtml('<strong style="color:red">hola</strong>')).toBe(
      '<strong>hola</strong>'
    )
  })

  it('removes disallowed tags (img, div, iframe, svg) but keeps their inner text', () => {
    expect(sanitizeChatterHtml('<img src=x onerror=alert(1)>texto')).toBe('texto')
    expect(sanitizeChatterHtml('<div>texto</div>')).toBe('texto')
    expect(sanitizeChatterHtml('<iframe src="javascript:alert(1)"></iframe>texto')).toBe('texto')
  })

  it('is case-insensitive for tag names', () => {
    expect(sanitizeChatterHtml('<STRONG>hola</STRONG>')).toBe('<strong>hola</strong>')
  })

  it('normalizes <br/> and <BR> to <br>', () => {
    expect(sanitizeChatterHtml('a<br/>b<BR>c')).toBe('a<br>b<br>c')
  })

  describe('anchor (<a>) handling', () => {
    it('keeps a safe http(s) href and adds default rel/target when absent', () => {
      expect(sanitizeChatterHtml('<a href="https://example.com">link</a>')).toBe(
        '<a href="https://example.com" rel="noopener noreferrer" target="_blank">link</a>'
      )
    })

    it('keeps a mailto: href', () => {
      expect(sanitizeChatterHtml('<a href="mailto:x@y.com">mail</a>')).toBe(
        '<a href="mailto:x@y.com" rel="noopener noreferrer" target="_blank">mail</a>'
      )
    })

    it('strips a javascript: href entirely (the whole opening tag is removed)', () => {
      expect(sanitizeChatterHtml('<a href="javascript:alert(1)">evil</a>')).toBe('evil</a>')
    })

    it('strips a data: href entirely', () => {
      expect(sanitizeChatterHtml('<a href="data:text/html,evil">evil</a>')).toBe('evil</a>')
    })

    it('strips an anchor with no href at all', () => {
      expect(sanitizeChatterHtml('<a>no href</a>')).toBe('no href</a>')
    })

    it('preserves caller-provided rel/target instead of the defaults', () => {
      expect(
        sanitizeChatterHtml('<a href="https://example.com" rel="nofollow" target="_self">link</a>')
      ).toBe('<a href="https://example.com" rel="nofollow" target="_self">link</a>')
    })
  })
})

describe('prepareChatterHtmlForDisplay', () => {
  it('sanitizes the normalized body (strips a trailing script after normalization)', () => {
    const result = prepareChatterHtmlForDisplay('<p>hola</p><script>alert(1)</script>')
    expect(result).toBe('<p>hola</p>')
  })

  it('collapses whitespace between adjacent </p><p> into a tight join', () => {
    const result = prepareChatterHtmlForDisplay('<p>uno</p>   <p>dos</p>')
    expect(result).toBe('<p>uno</p><p>dos</p>')
  })

  it('normalizes self-closing <br/> before sanitizing', () => {
    const result = prepareChatterHtmlForDisplay('linea1<br/>linea2')
    expect(result).toBe('linea1<br>linea2')
  })

  it('returns empty string for blank input', () => {
    expect(prepareChatterHtmlForDisplay('   ')).toBe('')
  })
})

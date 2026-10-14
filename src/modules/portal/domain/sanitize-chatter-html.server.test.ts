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
    it('descarta un href que no se puede parsear como URL (p. ej. "http://")', () => {
      const result = sanitizeChatterHtml('<a href="http://">x</a>')

      expect(result).not.toContain('<a')
      expect(result).not.toContain('http://')
    })

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

describe('sanitizeChatterHtml — adversarial inputs', () => {
  it('rejects javascript: hrefs regardless of case, leading whitespace or embedded tabs', () => {
    expect(sanitizeChatterHtml('<a href="JAVASCRIPT:alert(1)">x</a>')).toBe('x</a>')
    expect(sanitizeChatterHtml('<a href="  javascript:alert(1)">x</a>')).toBe('x</a>')
    expect(sanitizeChatterHtml('<a href="java\tscript:alert(1)">x</a>')).toBe('x</a>')
  })

  it('rejects vbscript: and file: hrefs', () => {
    expect(sanitizeChatterHtml('<a href="vbscript:msgbox(1)">x</a>')).toBe('x</a>')
    expect(sanitizeChatterHtml('<a href="file:///etc/passwd">x</a>')).toBe('x</a>')
  })

  it('matches the href attribute name case-insensitively', () => {
    expect(sanitizeChatterHtml('<a HREF="https://example.com">x</a>')).toBe(
      '<a href="https://example.com" rel="noopener noreferrer" target="_blank">x</a>'
    )
  })

  it('drops an anchor whose href is unquoted', () => {
    expect(sanitizeChatterHtml('<a href=https://example.com>x</a>')).toBe('x</a>')
  })

  it('accepts single-quoted hrefs and keeps the single quote', () => {
    expect(sanitizeChatterHtml("<a href='https://example.com'>x</a>")).toBe(
      "<a href='https://example.com' rel=\"noopener noreferrer\" target=\"_blank\">x</a>"
    )
  })

  it('drops event handlers (on*) and other attributes on anchors', () => {
    expect(
      sanitizeChatterHtml('<a href="https://example.com" onclick="alert(1)" style="x">x</a>')
    ).toBe('<a href="https://example.com" rel="noopener noreferrer" target="_blank">x</a>')
  })

  it('removes script/style blocks case-insensitively and across lines', () => {
    expect(sanitizeChatterHtml('<SCRIPT type="x">\nalert(1)\n</SCRIPT><p>a</p>')).toBe('<p>a</p>')
    expect(sanitizeChatterHtml('<STYLE>\np{}\n</STYLE><p>a</p>')).toBe('<p>a</p>')
  })

  it('does not reassemble a script tag from nested fragments', () => {
    const out = sanitizeChatterHtml('<scr<script>ipt>alert(1)</scr</script>ipt>')
    expect(out).not.toMatch(/<script/i)
  })

  it('leaves no tag other than the allowed ones in malformed markup', () => {
    const out = sanitizeChatterHtml('<p<img src=x onerror=alert(1)>hola</p>')
    expect(out).toBe('<p>hola</p>')
  })

  it('drops disallowed tags with attributes but keeps text (svg/object/embed/form)', () => {
    expect(sanitizeChatterHtml('<svg onload=alert(1)>a</svg><object data=x>b</object>')).toBe('ab')
    expect(sanitizeChatterHtml('<form action=x><input name=a>c</form>')).toBe('c')
  })

  it('keeps all allowed tags, lower-cased and without attributes', () => {
    for (const tag of ['p', 'strong', 'b', 'em', 'i', 'u', 's', 'ul', 'ol', 'li']) {
      expect(sanitizeChatterHtml(`<${tag.toUpperCase()} id="a">t</${tag.toUpperCase()}>`)).toBe(
        `<${tag}>t</${tag}>`
      )
    }
  })
})

describe('sanitizeChatterHtml — KNOWN GAPS documented as current behavior (see BUGS)', () => {
  it('BUG: caller-supplied rel is copied verbatim, so a single-quoted rel can inject extra attributes', () => {
    expect(
      sanitizeChatterHtml('<a href="https://a.com" rel=\'x" onmouseover="alert(1)\'>x</a>')
    ).toBe('<a href="https://a.com" rel="x" onmouseover="alert(1)" target="_blank">x</a>')
  })

  it('BUG: target is copied verbatim (any value, e.g. _top)', () => {
    expect(sanitizeChatterHtml('<a href="https://a.com" target="_top">x</a>')).toBe(
      '<a href="https://a.com" rel="noopener noreferrer" target="_top">x</a>'
    )
  })

  it('BUG: an entity-encoded javascript: scheme passes the protocol check (browser decodes it)', () => {
    expect(sanitizeChatterHtml('<a href="&#106;avascript:alert(1)">x</a>')).toBe(
      '<a href="&#106;avascript:alert(1)" rel="noopener noreferrer" target="_blank">x</a>'
    )
    expect(sanitizeChatterHtml('<a href="javascript&colon;alert(1)">x</a>')).toBe(
      '<a href="javascript&colon;alert(1)" rel="noopener noreferrer" target="_blank">x</a>'
    )
  })

  it('BUG: relative hrefs are accepted (resolved against a placeholder origin)', () => {
    expect(sanitizeChatterHtml('<a href="/rel">x</a>')).toBe(
      '<a href="/rel" rel="noopener noreferrer" target="_blank">x</a>'
    )
  })

  it('BUG: href= text inside another attribute value is picked up as the href', () => {
    expect(
      sanitizeChatterHtml('<a title="href=\'https://ok\'" href="javascript:alert(1)">x</a>')
    ).toBe('<a href=\'https://ok\' rel="noopener noreferrer" target="_blank">x</a>')
  })

  it('closing </a> of a rejected anchor is left orphaned in the output', () => {
    expect(sanitizeChatterHtml('<a href="javascript:1">x</a>')).toBe('x</a>')
  })
})

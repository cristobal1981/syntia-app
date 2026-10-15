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
      expect(sanitizeChatterHtml('<a href="javascript:alert(1)">evil</a>')).toBe('evil')
    })

    it('strips a data: href entirely', () => {
      expect(sanitizeChatterHtml('<a href="data:text/html,evil">evil</a>')).toBe('evil')
    })

    it('strips an anchor with no href at all', () => {
      expect(sanitizeChatterHtml('<a>no href</a>')).toBe('no href')
    })

    it('ignora el rel/target del original: siempre los fijos', () => {
      expect(
        sanitizeChatterHtml('<a href="https://example.com" rel="nofollow" target="_self">link</a>')
      ).toBe('<a href="https://example.com" rel="noopener noreferrer" target="_blank">link</a>')
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
    expect(sanitizeChatterHtml('<a href="JAVASCRIPT:alert(1)">x</a>')).toBe('x')
    expect(sanitizeChatterHtml('<a href="  javascript:alert(1)">x</a>')).toBe('x')
    expect(sanitizeChatterHtml('<a href="java\tscript:alert(1)">x</a>')).toBe('x')
  })

  it('rejects vbscript: and file: hrefs', () => {
    expect(sanitizeChatterHtml('<a href="vbscript:msgbox(1)">x</a>')).toBe('x')
    expect(sanitizeChatterHtml('<a href="file:///etc/passwd">x</a>')).toBe('x')
  })

  it('matches the href attribute name case-insensitively', () => {
    expect(sanitizeChatterHtml('<a HREF="https://example.com">x</a>')).toBe(
      '<a href="https://example.com" rel="noopener noreferrer" target="_blank">x</a>'
    )
  })

  it('acepta un href sin comillas y lo reescribe con comillas dobles', () => {
    expect(sanitizeChatterHtml('<a href=https://example.com>x</a>')).toBe(
      '<a href="https://example.com" rel="noopener noreferrer" target="_blank">x</a>'
    )
  })

  it('acepta href con comillas simples y lo reescribe con comillas dobles', () => {
    expect(sanitizeChatterHtml("<a href='https://example.com'>x</a>")).toBe(
      '<a href="https://example.com" rel="noopener noreferrer" target="_blank">x</a>'
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

describe('sanitizeChatterHtml — endurecimiento (antes eran huecos conocidos)', () => {
  it('REGRESIÓN: un rel con comillas no puede inyectar atributos (rel/target son siempre fijos)', () => {
    const out = sanitizeChatterHtml('<a href="https://a.com" rel=\'x" onmouseover="alert(1)\'>x</a>')

    expect(out).toBe('<a href="https://a.com" rel="noopener noreferrer" target="_blank">x</a>')
    expect(out).not.toContain('onmouseover')
  })

  it('REGRESIÓN: target no admite valores arbitrarios (_top, _self, _parent)', () => {
    for (const target of ['_top', '_self', '_parent', 'evil']) {
      expect(sanitizeChatterHtml(`<a href="https://a.com" target="${target}">x</a>`)).toBe(
        '<a href="https://a.com" rel="noopener noreferrer" target="_blank">x</a>'
      )
    }
  })

  it.each([
    ['numérica decimal', '&#106;avascript:alert(1)'],
    ['numérica hexadecimal', '&#x6a;avascript:alert(1)'],
    ['con &colon;', 'javascript&colon;alert(1)'],
    ['con &Tab;', 'java&Tab;script:alert(1)'],
    ['con &NewLine;', 'java&NewLine;script:alert(1)'],
    ['esquema en mayúsculas con entidad', '&#74;AVASCRIPT:alert(1)'],
  ])('REGRESIÓN: esquema javascript: codificado como entidad %s no pasa', (_label, href) => {
    const out = sanitizeChatterHtml(`<a href="${href}">x</a>`)

    expect(out).toBe('x')
    expect(out).not.toMatch(/javascript|&#|&colon;/i)
  })

  it('los href relativos o sin esquema se descartan (solo http, https y mailto en claro)', () => {
    for (const href of ['/rel', 'rel/path', '//evil.com', '#ancla', '?q=1', 'ftp://x.com']) {
      expect(sanitizeChatterHtml(`<a href="${href}">x</a>`)).toBe('x')
    }
  })

  it('REGRESIÓN: href= dentro del valor de otro atributo no se toma como el enlace', () => {
    expect(
      sanitizeChatterHtml('<a title="href=\'https://ok\'" href="javascript:alert(1)">x</a>')
    ).toBe('x')
    expect(
      sanitizeChatterHtml('<a title="href=\'https://ok\'" href="https://real.com">x</a>')
    ).toBe('<a href="https://real.com" rel="noopener noreferrer" target="_blank">x</a>')
  })

  it('el cierre </a> de un enlace descartado no queda huérfano', () => {
    expect(sanitizeChatterHtml('<a href="javascript:1">x</a>')).toBe('x')
    expect(sanitizeChatterHtml('hola</a>')).toBe('hola')
  })

  it('el cierre </a> de un enlace conservado sí se emite, y solo una vez por apertura', () => {
    expect(sanitizeChatterHtml('<a href="https://a.com">x</a></a>')).toBe(
      '<a href="https://a.com" rel="noopener noreferrer" target="_blank">x</a>'
    )
  })

  it('un href con espacios, <, > o caracteres de control se descarta', () => {
    for (const href of ['https://a.com/ b', 'https://a.com/<x', 'https://a.com/\u0001']) {
      expect(sanitizeChatterHtml(`<a href="${href}">x</a>`)).toBe('x')
    }
  })

  it('una comilla doble dentro de un href con comillas simples se escapa (%22) y no cierra el atributo', () => {
    const out = sanitizeChatterHtml(`<a href='https://a.com/?q="x"'>x</a>`)

    expect(out).toBe(
      '<a href="https://a.com/?q=%22x%22" rel="noopener noreferrer" target="_blank">x</a>'
    )
  })

  it('con comillas simples y espacios para colar un atributo, el enlace se descarta entero', () => {
    const out = sanitizeChatterHtml(`<a href='https://a.com/?q="x" onclick="alert(1)'>x</a>`)

    expect(out).toBe('x')
  })

  it('el esquema debe ir al principio del href: espacios o texto delante descartan el enlace', () => {
    for (const href of [' https://a.com', '\thttps://a.com', 'x https://a.com', 'xhttps://a.com']) {
      expect(sanitizeChatterHtml(`<a href="${href}">x</a>`)).toBe('x')
    }
  })

  it('una URL con & y query se conserva intacta', () => {
    expect(sanitizeChatterHtml('<a href="https://a.com/p?x=1&y=2">x</a>')).toBe(
      '<a href="https://a.com/p?x=1&y=2" rel="noopener noreferrer" target="_blank">x</a>'
    )
  })
})

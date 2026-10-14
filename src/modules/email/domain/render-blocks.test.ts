import { describe, expect, it } from 'vitest'

import { renderEmailBlock } from '@/src/modules/email/domain/render-blocks'

describe('renderEmailBlock — dispatcher', () => {
  it('enruta cada tipo a su renderizador', () => {
    expect(renderEmailBlock({ tipo: 'parrafo', html: 'hola' })).toContain('hola')
    expect(renderEmailBlock({ tipo: 'caja', textoLibre: 'Aviso' })).toContain('Aviso')
    expect(renderEmailBlock({ tipo: 'cta', href: 'https://x.test', label: 'Ir' })).toContain(
      'https://x.test'
    )
    expect(renderEmailBlock({ tipo: 'html', html: '<b>raw</b>' })).toBe('<b>raw</b>')
  })

  it('un bloque html sin html devuelve cadena vacía (no "undefined")', () => {
    expect(renderEmailBlock({ tipo: 'html' })).toBe('')
  })

  it('los tipos retirados (tabla, tarjetas, barra...) se omiten como cadena vacía', () => {
    for (const tipo of ['tabla', 'badges', 'tarjetas', 'barra', 'logros', 'bloqueColor']) {
      expect(renderEmailBlock({ tipo } as never)).toBe('')
    }
  })
})

describe('renderCaja', () => {
  it('pinta el texto libre dentro de la caja con el borde del tema', () => {
    const html = renderEmailBlock({ tipo: 'caja', textoLibre: 'Aviso libre' })

    expect(html).toContain('Aviso libre')
    expect(html).toContain('border-left: 4px solid')
  })

  it('el icono solo aparece si se da y va delante del texto', () => {
    expect(renderEmailBlock({ tipo: 'caja', icono: '⚠', textoLibre: 'x' })).toContain('⚠ x')
    expect(renderEmailBlock({ tipo: 'caja', textoLibre: 'x' })).not.toContain('undefined')
  })
})

describe('renderEmailBlock — escape', () => {
  const evil = '<script>alert(1)</script>'
  const escaped = '&lt;script&gt;alert(1)&lt;/script&gt;'

  it('parrafo.html, caja.textoLibre y html.html son HTML por contrato: se insertan tal cual', () => {
    expect(renderEmailBlock({ tipo: 'parrafo', html: evil })).toContain(evil)
    expect(renderEmailBlock({ tipo: 'caja', textoLibre: evil })).toContain(evil)
    expect(renderEmailBlock({ tipo: 'html', html: evil })).toBe(evil)
  })

  it('cta: una comilla en el href no puede cerrar el atributo (se escapa)', () => {
    const html = renderEmailBlock({
      tipo: 'cta',
      href: 'https://x.test/p"onclick="boom()',
      label: 'Ir',
    })

    expect(html).toContain('href="https://x.test/p&quot;onclick=&quot;boom()"')
    expect(html).not.toContain('onclick="boom()"')
  })

  it('cta: label escapado', () => {
    const html = renderEmailBlock({ tipo: 'cta', href: 'https://x.test', label: evil })

    expect(html).not.toContain('<script>')
    expect(html).toContain(escaped)
  })

  it('cta: mantiene un enlace https con query y &', () => {
    const html = renderEmailBlock({ tipo: 'cta', href: 'https://x.test/a?b=1&c=2', label: 'Ir' })

    expect(html).toContain('href="https://x.test/a?b=1&amp;c=2"')
  })

  it('cta: acepta mailto:', () => {
    expect(renderEmailBlock({ tipo: 'cta', href: 'mailto:a@b.es', label: 'Ir' })).toContain(
      'href="mailto:a@b.es"'
    )
  })

  it.each([
    'javascript:alert(1)',
    'JAVASCRIPT:alert(1)',
    'data:text/html,x',
    'vbscript:x',
    '//evil.com',
    '/ruta',
    'https://a.com/ b',
    ' javascript:alert(1)',
    '',
  ])('cta: href no seguro %j → no se genera el botón', (href) => {
    expect(renderEmailBlock({ tipo: 'cta', href, label: 'Ir' })).toBe('')
  })

  it('un tipo desconocido se omite como cadena vacía', () => {
    expect(renderEmailBlock({ tipo: 'inexistente' } as never)).toBe('')
  })
})

describe('renderEmailBlock — temas', () => {
  it('caja usa el tema info por defecto y respeta un tema explícito', () => {
    expect(renderEmailBlock({ tipo: 'caja', textoLibre: 'T' })).toContain('#01DEA2')
    const urg = renderEmailBlock({ tipo: 'caja', textoLibre: 'T', tema: 'urgente' })
    expect(urg).toContain('#F5A623')
    expect(urg).not.toContain('#01DEA2')
  })

  it('un tema inexistente cae a info en vez de romper', () => {
    const html = renderEmailBlock({ tipo: 'caja', textoLibre: 'T', tema: 'zzz' as never })
    expect(html).toContain('#01DEA2')
  })
})

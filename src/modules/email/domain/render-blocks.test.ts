import { describe, expect, it } from 'vitest'

import { renderEmailBlock } from '@/src/modules/email/domain/render-blocks'

describe('renderEmailBlock — dispatcher', () => {
  it('routes each tipo to its own renderer (non-empty, type-appropriate output)', () => {
    expect(renderEmailBlock({ tipo: 'parrafo', html: 'hola' })).toContain('hola')
    expect(renderEmailBlock({ tipo: 'caja', titulo: 'T', valorGrande: '5' })).toContain('5')
    expect(
      renderEmailBlock({ tipo: 'tarjetas', items: [{ valor: '1', etiqueta: 'uno' }] })
    ).toContain('uno')
    expect(renderEmailBlock({ tipo: 'barra', etiqueta: 'Progreso', valor: 50 })).toContain('50%')
    expect(
      renderEmailBlock({
        tipo: 'logros',
        items: [{ icono: '🏆', titulo: 'Logro', descripcion: 'd', desbloqueado: true }],
      })
    ).toContain('Logro')
    expect(
      renderEmailBlock({ tipo: 'tabla', columnas: ['A'], filas: [['1']] })
    ).toContain('<th')
    expect(
      renderEmailBlock({ tipo: 'badges', items: [{ etiqueta: 'E', valor: 'V' }] })
    ).toContain('E: V')
    expect(renderEmailBlock({ tipo: 'bloqueColor', titulo: 'Bloque' })).toContain('Bloque')
    expect(renderEmailBlock({ tipo: 'cta', href: 'https://x.test', label: 'Ir' })).toContain(
      'https://x.test'
    )
    expect(renderEmailBlock({ tipo: 'html', html: '<b>raw</b>' })).toBe('<b>raw</b>')
  })

  it('returns an empty string for an html block with no html (not "undefined")', () => {
    expect(renderEmailBlock({ tipo: 'html' })).toBe('')
  })
})

describe('renderCaja', () => {
  it('uses the textoLibre branch (free-text notice) when textoLibre is set, ignoring titulo/valorGrande', () => {
    const html = renderEmailBlock({
      tipo: 'caja',
      textoLibre: 'Aviso libre',
      titulo: 'Ignorado',
      valorGrande: 'Ignorado',
    })
    expect(html).toContain('Aviso libre')
    expect(html).not.toContain('Ignorado')
  })

  it('uses the titulo/valorGrande/subtitulo branch when textoLibre is absent', () => {
    const html = renderEmailBlock({
      tipo: 'caja',
      titulo: 'Clientes activos',
      valorGrande: '42',
      subtitulo: 'este mes',
    })
    expect(html).toContain('Clientes activos')
    expect(html).toContain('42')
    expect(html).toContain('este mes')
  })

  it('omits the subtitulo paragraph entirely when not provided', () => {
    const html = renderEmailBlock({ tipo: 'caja', titulo: 'T', valorGrande: '1' })
    expect(html).not.toMatch(/margin: 6px 0 0 0/)
  })
})

describe('renderTabla', () => {
  it('renders one <th> per column and one <tr> with <td>s per row, in order', () => {
    const html = renderEmailBlock({
      tipo: 'tabla',
      columnas: ['Nombre', 'Importe'],
      filas: [
        ['Modelo 303', '120€'],
        ['Modelo 111', '80€'],
      ],
    })
    expect(html.match(/<th /g)).toHaveLength(2)
    // 3 <tr>: la del <thead> + una por fila de datos.
    expect(html.match(/<tr /g)).toHaveLength(3)
    expect(html).toContain('Modelo 303')
    expect(html).toContain('120€')
    expect(html.indexOf('Modelo 303')).toBeLessThan(html.indexOf('Modelo 111'))
  })

  it('renders an empty head/body instead of throwing when columnas/filas are missing', () => {
    expect(() => renderEmailBlock({ tipo: 'tabla' })).not.toThrow()
  })
})

describe('renderBarra — clamping', () => {
  // La plantilla ya trae "width:100%" estático en dos contenedores — hay que
  // mirar el valor concreto en el `<td align="right">`, no solo "contains",
  // o un 100% sin relación con el clamping haría pasar el test igual.
  function labelCellValue(html: string): string | null {
    return html.match(/<td align="right"[^>]*>(-?\d+)%<\/td>/)?.[1] ?? null
  }

  it('clamps a value above 100 down to 100', () => {
    const html = renderEmailBlock({ tipo: 'barra', etiqueta: 'x', valor: 150 })
    expect(labelCellValue(html)).toBe('100')
  })

  it('clamps a negative value up to 0', () => {
    const html = renderEmailBlock({ tipo: 'barra', etiqueta: 'x', valor: -10 })
    expect(labelCellValue(html)).toBe('0')
  })

  it('passes through an in-range value unchanged', () => {
    const html = renderEmailBlock({ tipo: 'barra', etiqueta: 'x', valor: 37 })
    expect(labelCellValue(html)).toBe('37')
  })
})

describe('renderTarjetas', () => {
  it('returns an empty string when there are no items, instead of an empty table', () => {
    expect(renderEmailBlock({ tipo: 'tarjetas', items: [] })).toBe('')
    expect(renderEmailBlock({ tipo: 'tarjetas' })).toBe('')
  })

  it('renders one cell per item, each carrying its own etiqueta/valor', () => {
    const html = renderEmailBlock({
      tipo: 'tarjetas',
      items: [
        { valor: '10', etiqueta: 'Trámites' },
        { valor: '3', etiqueta: 'Firmas' },
      ],
    })
    expect(html).toContain('Trámites')
    expect(html).toContain('Firmas')
  })
})

describe('renderLogros', () => {
  it('groups achievements into rows of 3', () => {
    const items = Array.from({ length: 4 }, (_, i) => ({
      icono: '🏆',
      titulo: `Logro ${i}`,
      descripcion: 'd',
      desbloqueado: true,
    }))
    const html = renderEmailBlock({ tipo: 'logros', items })
    expect(html.match(/<tr>/g)).toHaveLength(2) // 3 + 1
  })

  it('dims (opacity 0.25, grayscale) an achievement that is not unlocked', () => {
    const html = renderEmailBlock({
      tipo: 'logros',
      items: [{ icono: '🔒', titulo: 'Bloqueado', descripcion: 'd', desbloqueado: false }],
    })
    expect(html).toContain('opacity:0.25')
    expect(html).toContain('grayscale(100%)')
  })

  it('does not dim an unlocked achievement', () => {
    const html = renderEmailBlock({
      tipo: 'logros',
      items: [{ icono: '🏆', titulo: 'Desbloqueado', descripcion: 'd', desbloqueado: true }],
    })
    expect(html).toContain('opacity:1')
    expect(html).toContain('filter:none')
  })
})

describe('renderBloqueColor', () => {
  it('prefers an explicit tabla over contenidoHtml when both are given', () => {
    const html = renderEmailBlock({
      tipo: 'bloqueColor',
      titulo: 'T',
      tabla: { tipo: 'tabla', columnas: ['C'], filas: [['v']] },
      contenidoHtml: '<p>fallback ignorado</p>',
    })
    expect(html).toContain('<th')
    expect(html).not.toContain('fallback ignorado')
  })

  it('falls back to contenidoHtml when no tabla is given', () => {
    const html = renderEmailBlock({
      tipo: 'bloqueColor',
      titulo: 'T',
      contenidoHtml: '<p>contenido libre</p>',
    })
    expect(html).toContain('contenido libre')
  })

  it('shows the cantidad in parentheses next to the title only when provided', () => {
    const withCount = renderEmailBlock({ tipo: 'bloqueColor', titulo: 'Pendientes', cantidad: 3 })
    expect(withCount).toContain('Pendientes (3)')

    const withoutCount = renderEmailBlock({ tipo: 'bloqueColor', titulo: 'Pendientes' })
    expect(withoutCount).not.toContain('(undefined)')
    expect(withoutCount).toContain('Pendientes')
    expect(withoutCount).not.toMatch(/Pendientes \(/)
  })
})

describe('renderEmailBlock — escape (comportamiento actual: NO se escapa nada)', () => {
  const evil = '<script>alert(1)</script>'

  it('parrafo.html se inserta crudo (es HTML por contrato)', () => {
    expect(renderEmailBlock({ tipo: 'parrafo', html: evil })).toContain(evil)
  })

  it('caja.titulo / valorGrande / subtitulo / textoLibre se insertan sin escapar', () => {
    const c = renderEmailBlock({ tipo: 'caja', titulo: evil, valorGrande: evil, subtitulo: evil })
    expect(c.split(evil)).toHaveLength(4)
    expect(renderEmailBlock({ tipo: 'caja', textoLibre: evil })).toContain(evil)
  })

  it('tabla.columnas y celdas se insertan sin escapar', () => {
    const html = renderEmailBlock({ tipo: 'tabla', columnas: [evil], filas: [[evil]] })
    expect(html.split(evil)).toHaveLength(3)
  })

  it('badges, tarjetas, barra, logros y bloqueColor insertan texto sin escapar', () => {
    expect(
      renderEmailBlock({ tipo: 'badges', items: [{ etiqueta: evil, valor: evil }] })
    ).toContain(`${evil}: ${evil}`)
    expect(
      renderEmailBlock({ tipo: 'tarjetas', items: [{ valor: evil, etiqueta: evil }] })
    ).toContain(evil)
    expect(renderEmailBlock({ tipo: 'barra', etiqueta: evil, valor: 1 })).toContain(evil)
    expect(
      renderEmailBlock({
        tipo: 'logros',
        titulo: evil,
        items: [{ icono: 'i', titulo: evil, descripcion: evil, desbloqueado: true }],
      })
    ).toContain(evil)
    expect(
      renderEmailBlock({ tipo: 'bloqueColor', titulo: evil, descripcion: evil })
    ).toContain(evil)
  })

  it('cta.href y label se insertan sin escapar: una comilla cierra el atributo href', () => {
    const html = renderEmailBlock({
      tipo: 'cta',
      href: 'https://x.test" onclick="boom()',
      label: evil,
    })
    expect(html).toContain('href="https://x.test" onclick="boom()"')
    expect(html).toContain(evil)
  })

  it('un tipo desconocido se omite como cadena vacía', () => {
    expect(renderEmailBlock({ tipo: 'inexistente' } as never)).toBe('')
  })
})

describe('renderEmailBlock — temas y ramas', () => {
  it('caja usa el tema info por defecto y respeta un tema explícito', () => {
    expect(renderEmailBlock({ tipo: 'caja', titulo: 'T' })).toContain('#01DEA2')
    const urg = renderEmailBlock({ tipo: 'caja', titulo: 'T', tema: 'urgente' })
    expect(urg).toContain('#F5A623')
    expect(urg).not.toContain('#01DEA2')
  })

  it('un tema inexistente cae a info en vez de romper', () => {
    const html = renderEmailBlock({ tipo: 'caja', titulo: 'T', tema: 'zzz' as never })
    expect(html).toContain('#01DEA2')
  })

  it('badges usa tema neutro por defecto', () => {
    expect(renderEmailBlock({ tipo: 'badges', items: [{ etiqueta: 'E', valor: 'V' }] })).toContain(
      '#F4F5F5'
    )
  })

  it('caja con titulo vacío no imprime "undefined"', () => {
    expect(renderEmailBlock({ tipo: 'caja' })).not.toContain('undefined')
  })

  it('tarjetas reparte el ancho: 84% / n y espaciador entre celdas', () => {
    const html = renderEmailBlock({
      tipo: 'tarjetas',
      items: [
        { valor: '1', etiqueta: 'a' },
        { valor: '2', etiqueta: 'b' },
        { valor: '3', etiqueta: 'c' },
      ],
    })
    expect(html.match(/width="28%"/g)).toHaveLength(3)
    expect(html.match(/<td width="2%">/g)).toHaveLength(2)
  })

  it('badges e iconos opcionales: el icono solo aparece si se da', () => {
    const con = renderEmailBlock({ tipo: 'badges', items: [{ etiqueta: 'E', valor: 'V', icono: '★' }] })
    expect(con).toContain('★ E: V')
    const sin = renderEmailBlock({ tipo: 'badges', items: [{ etiqueta: 'E', valor: 'V' }] })
    expect(sin).not.toContain('undefined')
  })

  it('bloqueColor: descripcion solo si se da; cantidad 0 sí se muestra', () => {
    expect(renderEmailBlock({ tipo: 'bloqueColor', titulo: 'T', descripcion: 'desc' })).toContain(
      'desc'
    )
    expect(renderEmailBlock({ tipo: 'bloqueColor', titulo: 'T', cantidad: 0 })).toContain('T (0)')
  })
})

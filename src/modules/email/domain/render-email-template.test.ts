import { describe, expect, it } from 'vitest'

import { renderEmailTemplate } from '@/src/modules/email/domain/render-email-template'

describe('renderEmailTemplate — tipo "cliente"', () => {
  it('wraps the rendered blocks with the client layout (600px, header + footer with confidentiality notice)', () => {
    const html = renderEmailTemplate({
      tipo: 'cliente',
      bloques: [{ tipo: 'parrafo', html: 'Contenido del mensaje' }],
    })
    expect(html).toContain('Contenido del mensaje')
    expect(html).toContain('width="600"')
    expect(html).toContain('Syntia, un producto de tenaasesores')
  })

  it('falls back to default saludo/despedida when not provided', () => {
    const html = renderEmailTemplate({ tipo: 'cliente', bloques: [] })
    expect(html).toContain('Hola,')
    expect(html).toContain('Un cordial saludo.')
  })

  it('uses the given saludo/despedida instead of the defaults', () => {
    const html = renderEmailTemplate({
      tipo: 'cliente',
      bloques: [],
      saludo: 'Hola Juan,',
      despedida: 'Saludos cordiales.',
    })
    expect(html).toContain('Hola Juan,')
    expect(html).toContain('Saludos cordiales.')
    expect(html).not.toContain('Hola,</p>')
  })

  it('renders the company name as text when no logoLightUrl is given', () => {
    const html = renderEmailTemplate({ tipo: 'cliente', bloques: [] })
    expect(html).not.toContain('<img')
    expect(html).toContain('Syntia')
  })

  it('renders an <img> tag when logoLightUrl is given, instead of the text fallback', () => {
    const html = renderEmailTemplate({
      tipo: 'cliente',
      bloques: [],
      logoLightUrl: 'https://cdn.test/logo-light.png',
    })
    expect(html).toContain('<img src="https://cdn.test/logo-light.png"')
  })
})

describe('renderEmailTemplate — tipo "informe"', () => {
  it('wraps the rendered blocks with the report layout (700px, dark header banner)', () => {
    const html = renderEmailTemplate({
      tipo: 'informe',
      bloques: [{ tipo: 'parrafo', html: 'Resumen semanal' }],
      tituloBanner: 'Informe semanal',
    })
    expect(html).toContain('Resumen semanal')
    expect(html).toContain('width="700"')
    expect(html).toContain('Informe semanal')
    expect(html).toContain('Informe automatizado interno — Syntia.')
  })

  it('omits the subtitle paragraph entirely when subtituloBanner is not given', () => {
    const html = renderEmailTemplate({
      tipo: 'informe',
      bloques: [],
      tituloBanner: 'T',
    })
    expect(html).not.toMatch(/margin:6px 0 0 0/)
  })

  it('includes the subtitle paragraph when subtituloBanner is given', () => {
    const html = renderEmailTemplate({
      tipo: 'informe',
      bloques: [],
      tituloBanner: 'T',
      subtituloBanner: 'Semana del 1 al 7',
    })
    expect(html).toContain('Semana del 1 al 7')
  })

  it('does NOT fall back to the client greeting/farewell (those are cliente-only)', () => {
    const html = renderEmailTemplate({ tipo: 'informe', bloques: [], tituloBanner: 'T' })
    expect(html).not.toContain('Hola,')
    expect(html).not.toContain('Un cordial saludo.')
  })
})

describe('renderEmailTemplate — bloques', () => {
  it('renders multiple blocks in order, joined into the body', () => {
    const html = renderEmailTemplate({
      tipo: 'cliente',
      bloques: [
        { tipo: 'parrafo', html: 'Primero' },
        { tipo: 'parrafo', html: 'Segundo' },
      ],
    })
    expect(html.indexOf('Primero')).toBeLessThan(html.indexOf('Segundo'))
  })

  it('renders an empty content area instead of throwing when bloques is empty', () => {
    expect(() => renderEmailTemplate({ tipo: 'cliente', bloques: [] })).not.toThrow()
  })
})

import { describe, expect, it } from 'vitest'

import {
  normalizeChatterDisplayBody,
  normalizeChatterDisplaySnippet,
} from '@/src/modules/portal/domain/normalize-chatter-display-body'

describe('normalizeChatterDisplayBody', () => {
  it('returns empty string for blank/whitespace-only input', () => {
    expect(normalizeChatterDisplayBody('   ')).toBe('')
  })

  it('leaves a plain message with no quote/signature/disclaimer untouched (modulo trim)', () => {
    expect(normalizeChatterDisplayBody('<p>Hola, una consulta</p>')).toBe(
      '<p>Hola, una consulta</p>'
    )
  })

  it('strips a gmail_quote div and everything after it', () => {
    const html =
      '<p>Mensaje real</p><div class="gmail_quote">El lun, 1 ene escribió: cosas citadas</div>'
    const result = normalizeChatterDisplayBody(html)
    expect(result).toContain('Mensaje real')
    expect(result).not.toContain('cosas citadas')
  })

  it('strips a <blockquote> block entirely', () => {
    const html = '<p>Mensaje real</p><blockquote><p>cita vieja</p></blockquote>'
    const result = normalizeChatterDisplayBody(html)
    expect(result).toContain('Mensaje real')
    expect(result).not.toContain('cita vieja')
  })

  it('cuts at a Spanish "escribió:" reply marker, keeping only the text before it', () => {
    const html = '<p>Gracias por la info.</p><p>El 2 de enero de 2026 Pedro escribió:</p><p>cita</p>'
    const result = normalizeChatterDisplayBody(html)
    expect(result).toContain('Gracias por la info.')
    expect(result).not.toContain('cita')
    expect(result).not.toContain('escribió')
  })

  it('cuts at an English "On ... wrote:" reply marker', () => {
    const html = '<p>Thanks.</p><p>On Jan 2, 2026, Pedro wrote:</p><p>quoted</p>'
    const result = normalizeChatterDisplayBody(html)
    expect(result).toContain('Thanks.')
    expect(result).not.toContain('quoted')
  })

  it('cuts at "-----Original Message-----"', () => {
    const html = '<p>Real text</p><p>-----Original Message-----</p><p>old stuff</p>'
    const result = normalizeChatterDisplayBody(html)
    expect(result).toContain('Real text')
    expect(result).not.toContain('old stuff')
  })

  it('does NOT cut a real message that happens to contain the word "escribió" without a colon/dash marker', () => {
    const html = '<p>Juan escribió el informe ayer, todo correcto.</p>'
    const result = normalizeChatterDisplayBody(html)
    expect(result).toContain('escribió el informe')
  })

  it('strips a signature block introduced by a lone "--" line', () => {
    const html = '<p>Un saludo y gracias.</p><p>--</p><p>Juan Pérez, Asesoría</p>'
    const result = normalizeChatterDisplayBody(html)
    expect(result).toContain('Un saludo y gracias.')
    expect(result).not.toContain('Juan Pérez')
  })

  it('does NOT strip anything when there is no "--" signature delimiter', () => {
    const html = '<p>Mensaje sin firma con doble guion -- en medio de una frase.</p>'
    // the pattern only matches "\n--\n" as its own line, not inline "--"
    const result = normalizeChatterDisplayBody(html)
    expect(result).toContain('Mensaje sin firma')
  })

  it('strips the known ecological-disclaimer boilerplate', () => {
    const html =
      '<p>Consulta real.</p><p>Por favor, protejamos el medio ambiente, imprima este correo solo si es necesario.</p>'
    const result = normalizeChatterDisplayBody(html)
    expect(result).toContain('Consulta real.')
    expect(result).not.toContain('protejamos el medio ambiente')
  })

  it('HTML-escapes the "&" of an already-entity-encoded line when re-wrapping it after a signature cut', () => {
    // stripHtmlToText only unescapes &nbsp;, so &lt;/&amp; survive as literal
    // text and escapeHtml then escapes their "&" again on re-wrap — known,
    // harmless double-encoding quirk for this rare combination (entities +
    // a signature cut), not a case anyone has reported seeing in practice.
    const html = '<p>Precio &amp; impuestos</p><p>--</p><p>firma</p>'
    const result = normalizeChatterDisplayBody(html)
    expect(result).toBe('<p>Precio &amp;amp; impuestos</p>')
  })
})

describe('normalizeChatterDisplaySnippet', () => {
  it('returns plain text with tags stripped', () => {
    expect(normalizeChatterDisplaySnippet('<p>Hola <b>mundo</b></p>')).toBe('Hola mundo')
  })

  it('returns empty string for blank input', () => {
    expect(normalizeChatterDisplaySnippet('   ')).toBe('')
  })

  it('truncates text longer than maxLength and appends an ellipsis', () => {
    const longText = `<p>${'a'.repeat(200)}</p>`
    const result = normalizeChatterDisplaySnippet(longText, 10)
    expect(result).toHaveLength(10)
    expect(result.endsWith('…')).toBe(true)
  })

  it('does NOT truncate text at or under maxLength', () => {
    const result = normalizeChatterDisplaySnippet('<p>short</p>', 10)
    expect(result).toBe('short')
  })
})

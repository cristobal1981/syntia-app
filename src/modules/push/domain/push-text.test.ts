import { describe, expect, it } from 'vitest'

import { htmlToPushPreview } from '@/src/modules/push/domain/push-text'

describe('htmlToPushPreview', () => {
  it('null si no hay texto', () => {
    expect(htmlToPushPreview(false)).toBeNull()
    expect(htmlToPushPreview(null)).toBeNull()
    expect(htmlToPushPreview('')).toBeNull()
    expect(htmlToPushPreview('<p><br></p>')).toBeNull()
  })

  it('quita etiquetas y separa párrafos y saltos con un espacio', () => {
    expect(htmlToPushPreview('<p>Hola <strong>Ana</strong></p><p>Sube el 303</p>')).toBe(
      'Hola Ana Sube el 303'
    )
    expect(htmlToPushPreview('Línea 1<br>Línea 2')).toBe('Línea 1 Línea 2')
  })

  it('decodifica las entidades básicas y colapsa espacios', () => {
    expect(htmlToPushPreview('<p>Tom &amp; Jerry&nbsp;&nbsp;&quot;ok&quot;</p>')).toBe(
      'Tom & Jerry "ok"'
    )
  })

  it('no deja pasar scripts ni atributos', () => {
    const preview = htmlToPushPreview('<p onclick="x()">Hola</p><script>alert(1)</script>')
    expect(preview).toBe('Hola')
  })

  it('recorta lo largo a 110 caracteres con puntos suspensivos', () => {
    const preview = htmlToPushPreview(`<p>${'a'.repeat(300)}</p>`)!
    expect(preview).toHaveLength(110)
    expect(preview.endsWith('…')).toBe(true)
  })

  it('un texto de exactamente 110 caracteres no se recorta', () => {
    expect(htmlToPushPreview(`<p>${'b'.repeat(110)}</p>`)).toBe('b'.repeat(110))
  })
})

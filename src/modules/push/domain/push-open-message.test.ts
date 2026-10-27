import { describe, expect, it } from 'vitest'

import { parsePushOpenMessage } from '@/src/modules/push/domain/push-open-message'

const message = (url: unknown, type: unknown = 'syntia:open-url') => ({ type, url })

describe('parsePushOpenMessage', () => {
  it('devuelve la ruta interna con su query', () => {
    expect(parsePushOpenMessage(message('/tramites?open=tramite-19845&tab=conversation'))).toBe(
      '/tramites?open=tramite-19845&tab=conversation'
    )
  })

  it('ignora mensajes de otro tipo', () => {
    expect(parsePushOpenMessage(message('/tramites', 'otra-cosa'))).toBeNull()
    expect(parsePushOpenMessage(message('/tramites', null))).toBeNull()
  })

  it.each([
    ['URL absoluta', 'https://evil.example/x'],
    ['protocolo relativo', '//evil.example/x'],
    ['barra invertida', '/\\evil.example'],
    ['normaliza a //', '/a/..//evil.example'],
    ['carácter de control', '/tramites\n'],
    ['sin barra inicial', 'tramites'],
    ['vacía', ''],
  ])('rechaza una ruta no segura: %s', (_label, url) => {
    expect(parsePushOpenMessage(message(url))).toBeNull()
  })

  it.each([[null], [undefined], ['texto'], [42], [[]]])('rechaza un dato que no es un mensaje: %j', (data) => {
    expect(parsePushOpenMessage(data)).toBeNull()
  })

  it('rechaza un mensaje cuya ruta no es texto', () => {
    expect(parsePushOpenMessage(message(123))).toBeNull()
    expect(parsePushOpenMessage(message(undefined))).toBeNull()
  })
})

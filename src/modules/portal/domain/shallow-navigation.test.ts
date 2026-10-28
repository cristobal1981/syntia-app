import { describe, expect, it } from 'vitest'

import { resolveNotificationNavigation } from '@/src/modules/portal/domain/shallow-navigation'

describe('resolveNotificationNavigation', () => {
  it('en la misma pantalla solo cambia la URL, sin ir al servidor', () => {
    expect(resolveNotificationNavigation('/tramites', '/tramites?open=tramite-5&tab=conversation')).toBe('shallow')
    expect(resolveNotificationNavigation('/obligaciones', '/obligaciones?open=task-9&tab=documents')).toBe('shallow')
  })

  it('desde otra pantalla navega de verdad', () => {
    expect(resolveNotificationNavigation('/dashboard', '/tramites?open=tramite-5&tab=conversation')).toBe('router')
    expect(resolveNotificationNavigation('/tramites', '/obligaciones?open=task-9')).toBe('router')
  })

  it('una ruta que solo se parece (prefijo) no cuenta como la misma pantalla', () => {
    expect(resolveNotificationNavigation('/tramites', '/tramites-antiguos?open=1')).toBe('router')
    expect(resolveNotificationNavigation('/tramites/otra', '/tramites?open=1')).toBe('router')
  })

  it('una URL de otro origen nunca se trata como la misma pantalla', () => {
    expect(resolveNotificationNavigation('/tramites', 'https://evil.example/tramites?open=1')).toBe('router')
    expect(resolveNotificationNavigation('/tramites', '//evil.example/tramites')).toBe('router')
  })

  it('una URL que no se puede interpretar va por el router', () => {
    expect(resolveNotificationNavigation('/tramites', 'http://')).toBe('router')
  })
})

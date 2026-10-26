import { describe, expect, it } from 'vitest'

import { resolvePushPrompt, type PushPromptState } from '@/src/modules/push/domain/push-prompt'

const show = (state: PushPromptState, overrides: { configured?: boolean; dismissed?: boolean | null } = {}) =>
  resolvePushPrompt({ configured: true, dismissed: false, state, ...overrides })

describe('aviso de activar las notificaciones', () => {
  it('se ofrece activar cuando el dispositivo puede y aún no están activas', () => {
    expect(show({ kind: 'off' })).toBe('enable')
  })

  it('en iPhone/iPad sin instalar se ofrece instalar, no activar', () => {
    expect(show({ kind: 'unsupported', support: 'install-required' })).toBe('install')
  })

  it.each<PushPromptState>([
    { kind: 'on' },
    { kind: 'denied' },
    { kind: 'loading' },
    { kind: 'unsupported', support: 'unsupported' },
  ])('no sale con el estado %j', (state) => {
    expect(show(state)).toBeNull()
  })

  it('no sale si ya lo cerraron en este dispositivo', () => {
    expect(show({ kind: 'off' }, { dismissed: true })).toBeNull()
    expect(show({ kind: 'unsupported', support: 'install-required' }, { dismissed: true })).toBeNull()
  })

  it('no sale hasta saber si lo cerraron (evita el parpadeo)', () => {
    expect(show({ kind: 'off' }, { dismissed: null })).toBeNull()
  })

  it('no sale si el push no está configurado en este entorno', () => {
    expect(show({ kind: 'off' }, { configured: false })).toBeNull()
  })
})

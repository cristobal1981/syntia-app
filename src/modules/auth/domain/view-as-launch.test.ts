import { describe, expect, it } from 'vitest'

import {
  IDLE_VIEW_AS_LAUNCH,
  VIEW_AS_LAUNCH_MAX_MS,
  VIEW_AS_LAUNCH_MIN_MS,
  launch,
  markViewAsReady,
  shouldGiveUp,
  shouldLaunch,
  startViewAsLaunch,
} from '@/src/modules/auth/domain/view-as-launch'

const T0 = 1_000_000

describe('despegue de la vista como cliente', () => {
  it('al empezar queda esperando, sin portal listo', () => {
    expect(startViewAsLaunch(T0)).toEqual({ phase: 'waiting', startedAt: T0, ready: false })
  })

  it('no despega mientras el portal no esté pintado, por mucho que pase el tiempo', () => {
    const waiting = startViewAsLaunch(T0)
    expect(shouldLaunch(waiting, T0 + VIEW_AS_LAUNCH_MIN_MS * 10)).toBe(false)
  })

  it('con el portal listo no despega antes del mínimo: un portal instantáneo no parpadea', () => {
    const ready = markViewAsReady(startViewAsLaunch(T0))
    expect(shouldLaunch(ready, T0 + VIEW_AS_LAUNCH_MIN_MS - 1)).toBe(false)
    expect(shouldLaunch(ready, T0 + VIEW_AS_LAUNCH_MIN_MS)).toBe(true)
  })

  it('con el portal lento, despega en cuanto está listo (ya pasó el mínimo)', () => {
    const slow = startViewAsLaunch(T0)
    expect(shouldLaunch(slow, T0 + 5000)).toBe(false)
    expect(shouldLaunch(markViewAsReady(slow), T0 + 5000)).toBe(true)
  })

  it('«listo» fuera de una espera no hace nada (la vista de otra pestaña no dispara un despegue)', () => {
    expect(markViewAsReady(IDLE_VIEW_AS_LAUNCH)).toBe(IDLE_VIEW_AS_LAUNCH)
    const launching = launch(markViewAsReady(startViewAsLaunch(T0)))
    expect(markViewAsReady(launching)).toBe(launching)
  })

  it('despegar pasa a launching y solo desde la espera', () => {
    const ready = markViewAsReady(startViewAsLaunch(T0))
    const launching = launch(ready)
    expect(launching.phase).toBe('launching')
    expect(launch(launching)).toBe(launching)
    expect(launch(IDLE_VIEW_AS_LAUNCH)).toBe(IDLE_VIEW_AS_LAUNCH)
  })

  it('en reposo o despegando nunca hay que despegar ni rendirse', () => {
    const launching = launch(markViewAsReady(startViewAsLaunch(T0)))
    for (const state of [IDLE_VIEW_AS_LAUNCH, launching]) {
      expect(shouldLaunch(state, T0 + 999_999)).toBe(false)
      expect(shouldGiveUp(state, T0 + 999_999)).toBe(false)
    }
  })

  it('se rinde pasado el plazo máximo sin portal pintado, y no antes', () => {
    const waiting = startViewAsLaunch(T0)
    expect(shouldGiveUp(waiting, T0 + VIEW_AS_LAUNCH_MAX_MS - 1)).toBe(false)
    expect(shouldGiveUp(waiting, T0 + VIEW_AS_LAUNCH_MAX_MS)).toBe(true)
  })

  it('con el portal ya pintado no se rinde: lo que toca es despegar', () => {
    const ready = markViewAsReady(startViewAsLaunch(T0))
    expect(shouldGiveUp(ready, T0 + VIEW_AS_LAUNCH_MAX_MS * 2)).toBe(false)
  })
})

import { describe, expect, it, vi } from 'vitest'

import {
  createConnectivityStore,
  isNetworkFailure,
} from '@/src/modules/portal/domain/portal-connectivity'

function setup(initialOnline = true) {
  let online = initialOnline
  let browserChange: () => void = () => {}
  const unsubscribeEnv = vi.fn()
  const store = createConnectivityStore({
    isOnline: () => online,
    subscribe(onChange) {
      browserChange = onChange
      return unsubscribeEnv
    },
  })
  return {
    store,
    unsubscribeEnv,
    setOnline(value: boolean) {
      online = value
      browserChange()
    },
    /** Cambia la red sin avisar (nadie estaba escuchando). */
    setOnlineSilently(value: boolean) {
      online = value
    },
  }
}

describe('isNetworkFailure', () => {
  it('solo un TypeError (fetch que no llega) cuenta como falta de red', () => {
    expect(isNetworkFailure(new TypeError('Failed to fetch'))).toBe(true)
    expect(isNetworkFailure(new Error('500'))).toBe(false)
    expect(isNetworkFailure('x')).toBe(false)
  })
})

describe('createConnectivityStore', () => {
  it('con red y sin fallos no está offline', () => {
    const { store } = setup()
    store.subscribe(() => {})
    expect(store.getSnapshot()).toBe(false)
  })

  it('el evento offline del navegador activa el estado y avisa', () => {
    const { store, setOnline } = setup()
    const listener = vi.fn()
    store.subscribe(listener)
    setOnline(false)
    expect(store.getSnapshot()).toBe(true)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('un fallo de red del sondeo marca offline aunque onLine sea true', () => {
    const { store } = setup()
    const listener = vi.fn()
    store.subscribe(listener)
    store.reportPollFailure()
    expect(store.getSnapshot()).toBe(true)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('un sondeo correcto limpia el fallo', () => {
    const { store } = setup()
    store.subscribe(() => {})
    store.reportPollFailure()
    store.reportPollSuccess()
    expect(store.getSnapshot()).toBe(false)
  })

  it('volver la red descarta el fallo del sondeo anterior', () => {
    const { store, setOnline } = setup()
    store.subscribe(() => {})
    store.reportPollFailure()
    setOnline(false)
    setOnline(true)
    expect(store.getSnapshot()).toBe(false)
  })

  it('sigue offline mientras el navegador diga offline aunque el sondeo vaya bien', () => {
    const { store, setOnline } = setup()
    store.subscribe(() => {})
    setOnline(false)
    store.reportPollSuccess()
    expect(store.getSnapshot()).toBe(true)
  })

  it('no avisa si el estado no cambia', () => {
    const { store } = setup()
    const listener = vi.fn()
    store.subscribe(listener)
    store.reportPollSuccess()
    store.reportPollFailure()
    store.reportPollFailure()
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('al quitar el último suscriptor deja de escuchar al navegador', () => {
    const { store, unsubscribeEnv } = setup()
    const off = store.subscribe(() => {})
    off()
    expect(unsubscribeEnv).toHaveBeenCalledTimes(1)
  })

  it('arranca offline si el navegador ya lo está al suscribirse', () => {
    const { store } = setup(false)
    store.subscribe(() => {})
    expect(store.getSnapshot()).toBe(true)
  })

  it('si la red cayó sin suscriptores, al suscribirse el estado ya es offline', () => {
    const { store, setOnlineSilently } = setup()
    const off = store.subscribe(() => {})
    off()
    setOnlineSilently(false)
    store.subscribe(() => {})
    expect(store.getSnapshot()).toBe(true)
  })
})

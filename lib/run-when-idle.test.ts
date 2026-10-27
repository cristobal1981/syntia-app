import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { runWhenIdle } from '@/lib/run-when-idle'

describe('runWhenIdle', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('requestIdleCallback', undefined)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('no ejecuta nada antes del retraso y sí después', () => {
    const task = vi.fn()
    runWhenIdle(task, 1000)
    vi.advanceTimersByTime(999)
    expect(task).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(task).toHaveBeenCalledTimes(1)
  })

  it('cancelar antes del retraso evita la ejecución', () => {
    const task = vi.fn()
    const cancel = runWhenIdle(task, 1000)
    cancel()
    vi.advanceTimersByTime(5000)
    expect(task).not.toHaveBeenCalled()
  })

  it('con requestIdleCallback espera a que el navegador esté libre y se puede cancelar', () => {
    const callbacks: Array<() => void> = []
    const cancelIdle = vi.fn()
    vi.stubGlobal('requestIdleCallback', (cb: () => void) => {
      callbacks.push(cb)
      return 7
    })
    vi.stubGlobal('cancelIdleCallback', cancelIdle)
    const task = vi.fn()
    const cancel = runWhenIdle(task, 100)
    vi.advanceTimersByTime(100)
    expect(task).not.toHaveBeenCalled()
    expect(callbacks).toHaveLength(1)
    cancel()
    expect(cancelIdle).toHaveBeenCalledWith(7)
    callbacks[0]!()
    expect(task).toHaveBeenCalledTimes(1)
  })
})

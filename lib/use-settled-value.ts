'use client'

import { useEffect, useState } from 'react'

export type SettledState<T> = { settled: T; wasEnabled: boolean }

/**
 * Qué valor «asentado» corresponde en este render. Al activarse o desactivarse
 * (p. ej. al abrir o cerrar un panel) se sincroniza al instante, sin esperar; y
 * mientras está desactivado sigue al valor sin más. Solo cuando está activo y el
 * valor cambia, el asentado se queda atrás hasta que el hook lo alcance con retraso.
 */
export function syncSettledState<T>(
  state: SettledState<T>,
  input: { value: T; enabled: boolean }
): SettledState<T> {
  if (input.enabled !== state.wasEnabled) {
    return { settled: input.value, wasEnabled: input.enabled }
  }
  if (!input.enabled && !Object.is(state.settled, input.value)) {
    return { settled: input.value, wasEnabled: false }
  }
  return state
}

/**
 * Para trabajo pesado ligado a lo que se está viendo (cargar el chat de un
 * elemento…): mientras el valor sigue cambiando rápido (navegar con las flechas),
 * `isSettling` es `true` y no hay que lanzar nada; cuando se queda quieto
 * `delayMs`, pasa a `false`. Con `enabled` en `false` no espera nunca, y al
 * activarse tampoco (la primera apertura no se retrasa).
 */
export function useSettledValue<T>(
  value: T,
  delayMs: number,
  enabled = true
): { value: T; isSettling: boolean } {
  const [state, setState] = useState<SettledState<T>>({ settled: value, wasEnabled: enabled })

  // Ajuste durante el render (no en un efecto): se sincroniza sin un render intermedio.
  const synced = syncSettledState(state, { value, enabled })
  if (synced !== state) setState(synced)

  const isSettling = enabled && !Object.is(value, synced.settled)

  useEffect(() => {
    if (!isSettling) return
    const timer = window.setTimeout(() => {
      setState((current) => ({ ...current, settled: value }))
    }, delayMs)
    return () => window.clearTimeout(timer)
  }, [isSettling, value, delayMs])

  return { value: enabled ? synced.settled : value, isSettling }
}

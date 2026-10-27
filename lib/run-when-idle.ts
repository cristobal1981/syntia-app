/**
 * Ejecuta `task` cuando el navegador esté libre, pasados al menos `delayMs`. Pensado para
 * comprobaciones que no hacen falta para pintar (botones opcionales, limpiezas): las Server
 * Actions del cliente van en cola, y lo lanzado al montar se pone delante de lo que el usuario
 * está esperando. Devuelve la función que lo cancela.
 */
export function runWhenIdle(task: () => void, delayMs = 1500): () => void {
  let cancelIdle: (() => void) | null = null

  const timer = setTimeout(() => {
    if (typeof requestIdleCallback === 'function') {
      const id = requestIdleCallback(task, { timeout: 2000 })
      cancelIdle = () => cancelIdleCallback(id)
      return
    }
    task()
  }, delayMs)

  return () => {
    clearTimeout(timer)
    cancelIdle?.()
  }
}

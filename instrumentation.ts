/**
 * En desarrollo deja un rótulo bien visible cada vez que arranca el servidor, para saber desde
 * qué línea del terminal copiar los logs de una prueba (todo lo anterior es de otra ejecución).
 */
export function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs' || process.env.NODE_ENV !== 'development') return

  const stamp = new Date().toLocaleTimeString('es-ES', { hour12: false })
  const line = '█'.repeat(64)
  const text = `  ▶▶▶  SERVIDOR ARRANCADO ${stamp}  —  COPIA DESDE AQUÍ HACIA ABAJO  ◀◀◀`
  console.log(`\n\x1b[1;30;43m${line}\n${text.padEnd(64)}\n${line}\x1b[0m\n`)
}

/**
 * Retardo (ms) con el que entra un bloque al sustituir un skeleton: crece con la posición, así
 * la UI se enciende de arriba abajo y, dentro de cada franja, de izquierda a derecha.
 * La vertical pesa más por píxel que la horizontal, así que el avance es una diagonal que baja y
 * no un barrido de columnas. Tope bajo: es acabado, no espera.
 */
const MS_PER_PX_TOP = 0.28
const MS_PER_PX_LEFT = 0.1
export const REVEAL_MAX_DELAY_MS = 520

export function computeRevealDelay(top: number, left: number): number {
  const delay = Math.max(0, top) * MS_PER_PX_TOP + Math.max(0, left) * MS_PER_PX_LEFT
  return Math.round(Math.min(REVEAL_MAX_DELAY_MS, delay))
}

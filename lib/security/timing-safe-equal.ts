import { timingSafeEqual } from 'crypto'

/**
 * Compara dos strings en tiempo constante (longitud igual) para evitar
 * timing attacks al validar secretos de webhook. Si las longitudes
 * difieren no son iguales — comparar longitudes primero no filtra nada
 * más sensible que el propio secreto.
 */
export function timingSafeEqualStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

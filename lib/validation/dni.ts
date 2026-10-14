import { normalizeUpperNoSpaces } from '@/lib/validation/strings'

const DNI_CONTROL_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE'
const NIE_PREFIX_DIGIT: Record<string, string> = { X: '0', Y: '1', Z: '2' }

/** DNI o NIE de persona (trabajadores, trámites). */
export function normalizeDni(value: string): string {
  return normalizeUpperNoSpaces(value)
}

/**
 * Letra de control de un DNI o NIE ya normalizado (el resto de cifras módulo
 * 23; en el NIE, X/Y/Z se sustituyen por 0/1/2). `null` si no tiene formato.
 */
export function dniControlLetter(normalized: string): string | null {
  const match = /^([XYZ]|[0-9])([0-9]{7})[A-Z]$/.exec(normalized)
  if (!match) return null
  const digits = `${NIE_PREFIX_DIGIT[match[1]] ?? match[1]}${match[2]}`
  return DNI_CONTROL_LETTERS[Number(digits) % 23]
}

/** Formato correcto Y letra de control válida. */
export function isValidDni(value: string): boolean {
  const normalized = normalizeDni(value)
  const expected = dniControlLetter(normalized)
  return expected !== null && normalized.endsWith(expected)
}

import { normalizeUpperNoSpaces, trim } from '@/lib/validation/strings'

/** DNI o NIE de persona (trabajadores, trámites). */
export function normalizeDni(value: string): string {
  return normalizeUpperNoSpaces(value)
}

export function isValidDni(value: string): boolean {
  const normalized = normalizeDni(value)
  return (
    /^[0-9]{8}[A-Z]$/.test(normalized) ||
    /^[XYZ][0-9]{7}[A-Z]$/.test(normalized)
  )
}

export function isPresentDni(value: string): boolean {
  return trim(value).length > 0
}

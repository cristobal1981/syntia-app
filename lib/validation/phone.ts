import { trim } from '@/lib/validation/strings'

// Solo espacios normales como separador: `\s` admitiría saltos de línea y tabuladores.
const PHONE_RE = /^\+?[0-9][0-9 \-().]{7,}$/

/** Teléfono opcional: vacío es válido. */
export function isValidPhone(value: string): boolean {
  const normalized = trim(value)
  if (!normalized) return true
  return PHONE_RE.test(normalized)
}

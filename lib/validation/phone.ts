import { trim } from '@/lib/validation/strings'

const PHONE_RE = /^\+?[0-9][0-9\s\-().]{7,}$/

/** Teléfono opcional: vacío es válido. */
export function isValidPhone(value: string): boolean {
  const normalized = trim(value)
  if (!normalized) return true
  return PHONE_RE.test(normalized)
}

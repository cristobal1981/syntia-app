import { trim } from '@/lib/validation/strings'

const POSTAL_CODE_RE = /^[0-9]{5}$/

export function isValidSpanishPostalCode(value: string): boolean {
  return POSTAL_CODE_RE.test(trim(value))
}

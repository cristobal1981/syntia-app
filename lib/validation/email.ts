import { trim } from '@/lib/validation/strings'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(trim(value))
}

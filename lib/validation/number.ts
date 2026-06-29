import { trim } from '@/lib/validation/strings'

export function isValidPositiveDecimal(
  value: string,
  options?: { maxIntegerDigits?: number; maxFractionDigits?: number }
): boolean {
  const normalized = trim(value).replace(/\./g, '').replace(',', '.')
  const maxInt = options?.maxIntegerDigits ?? 12
  const maxFrac = options?.maxFractionDigits ?? 2
  const pattern = new RegExp(`^\\d{1,${maxInt}}(\\.\\d{1,${maxFrac}})?$`)
  return pattern.test(normalized) && Number(normalized) > 0
}

export function isValidPositiveInteger(
  value: string,
  options?: { maxDigits?: number; min?: number; max?: number }
): boolean {
  const normalized = trim(value)
  const maxDigits = options?.maxDigits ?? 3
  if (!new RegExp(`^\\d{1,${maxDigits}}$`).test(normalized)) return false
  const num = Number(normalized)
  if (num < (options?.min ?? 1)) return false
  if (options?.max !== undefined && num > options.max) return false
  return true
}

export function isValidFourDigitYear(value: string): boolean {
  return /^\d{4}$/.test(trim(value))
}

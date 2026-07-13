import { isValidIsoDate } from '@/lib/validation/date'
import { trim } from '@/lib/validation/strings'

export type FieldRuleResult<T extends string = string> =
  | { ok: true }
  | { ok: false; error: T }

export function requireTrimmed<T extends string>(
  value: string,
  error: T
): FieldRuleResult<T> {
  if (!trim(value)) return { ok: false, error }
  return { ok: true }
}

export function requireMaxLength<T extends string>(
  value: string,
  max: number,
  error: T
): FieldRuleResult<T> {
  if (trim(value).length > max) return { ok: false, error }
  return { ok: true }
}

export function requireIsoDate<T extends string>(
  value: string,
  requiredError: T,
  invalidError: T
): FieldRuleResult<T> {
  const date = trim(value)
  if (!date) return { ok: false, error: requiredError }
  if (!isValidIsoDate(date)) return { ok: false, error: invalidError }
  return { ok: true }
}

export function requireSelected<T extends string>(
  value: string,
  error: T
): FieldRuleResult<T> {
  if (!trim(value)) return { ok: false, error }
  return { ok: true }
}

export function applyFieldRule<T extends string>(
  fieldErrors: Record<string, T>,
  field: string,
  result: FieldRuleResult<T>
) {
  if (!result.ok) {
    fieldErrors[field] = result.error
  }
}

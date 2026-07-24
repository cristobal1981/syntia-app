export type PasswordValidationFailure =
  | 'too_short'
  | 'missing_uppercase'
  | 'missing_lowercase'
  | 'missing_digit'
  | 'missing_symbol'

export type PasswordValidationResult =
  | { ok: true }
  | { ok: false; reason: PasswordValidationFailure }

const MIN_PASSWORD_LENGTH = 8

export type PasswordRequirementStatus = {
  minLength: boolean
  uppercase: boolean
  lowercase: boolean
  digit: boolean
  symbol: boolean
}

const HAS_SYMBOL = /[^A-Za-z0-9]/

export function getPasswordRequirementStatus(
  password: string
): PasswordRequirementStatus {
  return {
    minLength: password.length >= MIN_PASSWORD_LENGTH,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    digit: /[0-9]/.test(password),
    symbol: HAS_SYMBOL.test(password),
  }
}

export function isStrongPassword(password: string): boolean {
  const status = getPasswordRequirementStatus(password)
  return (
    status.minLength &&
    status.uppercase &&
    status.lowercase &&
    status.digit &&
    status.symbol
  )
}

export function validateStrongPassword(
  password: string
): PasswordValidationResult {
  const status = getPasswordRequirementStatus(password)
  if (!status.minLength) {
    return { ok: false, reason: 'too_short' }
  }
  if (!status.uppercase) {
    return { ok: false, reason: 'missing_uppercase' }
  }
  if (!status.lowercase) {
    return { ok: false, reason: 'missing_lowercase' }
  }
  if (!status.digit) {
    return { ok: false, reason: 'missing_digit' }
  }
  if (!status.symbol) {
    return { ok: false, reason: 'missing_symbol' }
  }
  return { ok: true }
}

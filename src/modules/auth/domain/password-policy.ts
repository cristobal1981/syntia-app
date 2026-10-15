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

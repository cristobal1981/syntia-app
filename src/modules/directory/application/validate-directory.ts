export function validatePersonFirstName(value: string): string | undefined {
  if (!value.trim()) return 'El nombre es obligatorio.'
  if (value.trim().length < 2) {
    return 'El nombre debe tener al menos 2 caracteres.'
  }
  return undefined
}

export function validatePersonFirstSurname(value: string): string | undefined {
  if (!value.trim()) return 'El primer apellido es obligatorio.'
  if (value.trim().length < 2) {
    return 'El primer apellido debe tener al menos 2 caracteres.'
  }
  return undefined
}

export function validatePersonSecondSurname(value: string): string | undefined {
  if (!value.trim()) return undefined
  if (value.trim().length < 2) {
    return 'El segundo apellido debe tener al menos 2 caracteres.'
  }
  return undefined
}

export function validatePersonNameParts(parts: {
  firstName: string
  firstSurname: string
  secondSurname?: string
}): Record<string, string> {
  const fieldErrors: Record<string, string> = {}
  const firstNameError = validatePersonFirstName(parts.firstName)
  const firstSurnameError = validatePersonFirstSurname(parts.firstSurname)
  const secondSurnameError = validatePersonSecondSurname(
    parts.secondSurname ?? ''
  )
  if (firstNameError) fieldErrors.firstName = firstNameError
  if (firstSurnameError) fieldErrors.firstSurname = firstSurnameError
  if (secondSurnameError) fieldErrors.secondSurname = secondSurnameError
  return fieldErrors
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validatePersonEmail(email: string): string | undefined {
  if (!email.trim()) return 'El correo es obligatorio.'
  if (!EMAIL_PATTERN.test(email.trim())) return 'Introduce un correo válido.'
  return undefined
}

export function validateOdooPartnerId(value: string): string | undefined {
  if (!value.trim()) return undefined
  if (!/^[0-9]+$/.test(value.trim())) {
    return 'El ID de Odoo debe ser numérico.'
  }
  return undefined
}

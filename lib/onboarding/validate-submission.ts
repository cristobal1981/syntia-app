const MIN_ANNUAL_INCOME_EUR = 10_000
const PHONE_REGEX = /^\+34\d{9}$/
const POSTAL_CODE_REGEX = /^\d{5}$/
const SIMPLE_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const IBAN_ES_REGEX = /^ES\d{22}$/
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/
const NAF_MIN_DIGITS = 9
const NAF_MAX_DIGITS = 12
const MIN_AGE_YEARS = 18
const MAX_AGE_YEARS = 100
const FULL_ADDRESS_MAX_LENGTH = 320

/** Normalized submission used for Odoo create. */
export type AltaAutonomoSubmission = {
  firstName: string
  lastName: string
  nifNie: string
  naf?: string
  birthDate: string
  phone: string
  email: string
  hasDigitalCertificate: boolean
  isAlreadyAutonomo: boolean
  startedAutonomoAt?: string
  wantsStartWithUsAt: string
  requestedAltaAt?: string
  wasAutonomoLast3Years?: boolean
  previousAutonomoEndDate?: string
  activityAddress: string
  city: string
  provinceId: number
  postalCode: string
  countryId: number
  fiscalAddress: string
  notificationAddress: string
  activityDescription: string
  annualIncomeEstimateEur: number
  iban: string
  comments?: string
  acceptsPrivacyPolicy: boolean
}

export type AltaAutonomoSubmissionValidationResult =
  | { ok: true; data: AltaAutonomoSubmission }
  | { ok: false; fieldErrors: Record<string, string> }

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function parsePositiveInt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) return value
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value.trim(), 10)
    if (Number.isInteger(parsed) && parsed > 0) return parsed
  }
  return null
}

function parseYesNo(value: unknown): 'si' | 'no' | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toLowerCase()
  if (normalized === 'si') return 'si'
  if (normalized === 'no') return 'no'
  return null
}

function parseAnnualIncome(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Number.isInteger(value) ? value : null
  }
  if (typeof value === 'string') {
    const digits = value.trim().replace(/\D/g, '')
    if (!digits) return null
    const parsed = Number.parseInt(digits, 10)
    return Number.isInteger(parsed) ? parsed : null
  }
  return null
}

function isValidIsoDate(value: string): boolean {
  if (!DATE_REGEX.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime())
}

/** El NAF es opcional: una cadena vacía es válida, pero si se indica debe ser numérico. */
function isValidNaf(value: string): boolean {
  if (!value) return true
  const digits = value.replace(/\D/g, '')
  return (
    digits.length >= NAF_MIN_DIGITS && digits.length <= NAF_MAX_DIGITS && digits === value
  )
}

function isValidBirthDate(value: string): boolean {
  if (!isValidIsoDate(value)) return false

  const birthDate = new Date(`${value}T00:00:00.000Z`)
  const now = new Date()
  let age = now.getUTCFullYear() - birthDate.getUTCFullYear()
  const hasHadBirthdayThisYear =
    now.getUTCMonth() > birthDate.getUTCMonth() ||
    (now.getUTCMonth() === birthDate.getUTCMonth() && now.getUTCDate() >= birthDate.getUTCDate())
  if (!hasHadBirthdayThisYear) age -= 1

  return age >= MIN_AGE_YEARS && age <= MAX_AGE_YEARS
}

function isValidDniNie(value: string): boolean {
  const normalized = value.trim().toUpperCase().replace(/[-\s]/g, '')
  if (!/^[XYZ]?\d{7,8}[A-Z]$/.test(normalized)) return false

  const letters = 'TRWAGMYFPDXBNJZSQVHLCKE'
  const prefix = normalized[0]
  const replaced =
    prefix === 'X'
      ? `0${normalized.slice(1)}`
      : prefix === 'Y'
        ? `1${normalized.slice(1)}`
        : prefix === 'Z'
          ? `2${normalized.slice(1)}`
          : normalized

  const numberPart = replaced.slice(0, -1)
  const letter = replaced.slice(-1)
  const number = Number.parseInt(numberPart, 10)
  if (!Number.isInteger(number)) return false
  return letters[number % 23] === letter
}

function isValidSpanishIban(value: string): boolean {
  const normalized = value.toUpperCase().replace(/\s+/g, '')
  if (!IBAN_ES_REGEX.test(normalized)) return false

  const rearranged = `${normalized.slice(4)}${normalized.slice(0, 4)}`
  let converted = ''
  for (const char of rearranged) {
    if (char >= 'A' && char <= 'Z') {
      converted += String(char.charCodeAt(0) - 55)
    } else {
      converted += char
    }
  }

  let remainder = 0
  for (const char of converted) {
    remainder = (remainder * 10 + Number.parseInt(char, 10)) % 97
  }
  return remainder === 1
}

/**
 * Validates the landing-site payload (Spanish snake_case field names).
 */
export function validateAltaAutonomoSubmission(
  payload: unknown
): AltaAutonomoSubmissionValidationResult {
  if (!payload || typeof payload !== 'object') {
    return { ok: false, fieldErrors: { _form: 'Solicitud invalida.' } }
  }

  const raw = payload as Record<string, unknown>
  const fieldErrors: Record<string, string> = {}

  const nombre = normalizeText(raw.nombre)
  const apellidos = normalizeText(raw.apellidos)
  const nif = normalizeText(raw.nif).toUpperCase()
  const naf = normalizeText(raw.naf).replace(/\s+/g, '')
  const fechaNacimiento = normalizeText(raw.fecha_nacimiento)
  const telefono = normalizeText(raw.telefono).replace(/\s+/g, '')
  const email = normalizeText(raw.email).toLowerCase()
  const certificadoDigital = parseYesNo(raw.certificado_digital)
  const yaEresAutonomo = parseYesNo(raw.ya_eres_autonomo)
  const fechaAlta = normalizeText(raw.fecha_alta)
  const fechaDarAlta = normalizeText(raw.fecha_dar_alta)
  const fuisteAutonomo3Anos = parseYesNo(raw.fuiste_autonomo_3_anos)
  const fechaBaja = normalizeText(raw.fecha_baja)
  const fechaEmpezarConNosotros = normalizeText(raw.fecha_empezar_con_nosotros)
  const direccion = normalizeText(raw.direccion)
  const ciudad = normalizeText(raw.ciudad)
  const codigoPostal = normalizeText(raw.codigo_postal)
  const direccionFiscal = normalizeText(raw.direccion_fiscal)
  const direccionNotificacion = normalizeText(raw.direccion_notificacion)
  const actividad = normalizeText(raw.actividad)
  const iban = normalizeText(raw.iban).toUpperCase().replace(/\s+/g, '')
  const comentarios = normalizeText(raw.comentarios)
  const ingresosAnuales = parseAnnualIncome(raw.ingresos_anuales)
  const privacidad = raw.privacidad === true

  if (!nombre) fieldErrors.nombre = 'El nombre es obligatorio.'
  if (!apellidos) fieldErrors.apellidos = 'Los apellidos son obligatorios.'

  if (!nif) {
    fieldErrors.nif = 'El NIF/NIE es obligatorio.'
  } else if (!isValidDniNie(nif)) {
    fieldErrors.nif = 'El NIF/NIE no es válido.'
  }

  if (!isValidNaf(naf)) {
    fieldErrors.naf = 'El NAF no es válido.'
  }

  if (!fechaNacimiento) {
    fieldErrors.fecha_nacimiento = 'La fecha de nacimiento es obligatoria.'
  } else if (!isValidBirthDate(fechaNacimiento)) {
    fieldErrors.fecha_nacimiento = 'La fecha de nacimiento no es válida.'
  }

  if (!telefono) {
    fieldErrors.telefono = 'El teléfono es obligatorio.'
  } else if (!PHONE_REGEX.test(telefono)) {
    fieldErrors.telefono = 'Usa el formato +34666666666.'
  }

  if (!email) {
    fieldErrors.email = 'El correo electrónico es obligatorio.'
  } else if (!SIMPLE_EMAIL_REGEX.test(email)) {
    fieldErrors.email = 'El correo electrónico no es válido.'
  }

  if (!certificadoDigital) {
    fieldErrors.certificado_digital = 'Indica si tienes certificado digital o clave.'
  }

  if (!yaEresAutonomo) {
    fieldErrors.ya_eres_autonomo = 'Indica si ya eres autónomo.'
  } else if (yaEresAutonomo === 'si') {
    if (!fechaAlta) {
      fieldErrors.fecha_alta = 'La fecha de alta actual es obligatoria.'
    } else if (!isValidIsoDate(fechaAlta)) {
      fieldErrors.fecha_alta = 'La fecha de alta actual no es válida.'
    }
  } else {
    if (!fechaDarAlta) {
      fieldErrors.fecha_dar_alta = 'La fecha de alta solicitada es obligatoria.'
    } else if (!isValidIsoDate(fechaDarAlta)) {
      fieldErrors.fecha_dar_alta = 'La fecha de alta solicitada no es válida.'
    }

    if (!fuisteAutonomo3Anos) {
      fieldErrors.fuiste_autonomo_3_anos =
        'Indica si fuiste autónomo en los últimos 3 años.'
    } else if (fuisteAutonomo3Anos === 'si') {
      if (!fechaBaja) {
        fieldErrors.fecha_baja = 'La fecha de baja anterior es obligatoria.'
      } else if (!isValidIsoDate(fechaBaja)) {
        fieldErrors.fecha_baja = 'La fecha de baja anterior no es válida.'
      }
    }
  }

  if (!fechaEmpezarConNosotros) {
    fieldErrors.fecha_empezar_con_nosotros =
      'La fecha de inicio con nosotros es obligatoria.'
  } else if (!isValidIsoDate(fechaEmpezarConNosotros)) {
    fieldErrors.fecha_empezar_con_nosotros =
      'La fecha de inicio con nosotros no es válida.'
  }

  if (!direccion) fieldErrors.direccion = 'La dirección de actividad es obligatoria.'
  if (!ciudad) fieldErrors.ciudad = 'La ciudad es obligatoria.'

  const provinciaId = parsePositiveInt(raw.provincia)
  if (!provinciaId) fieldErrors.provincia = 'Selecciona una provincia válida.'

  if (!codigoPostal) {
    fieldErrors.codigo_postal = 'El código postal es obligatorio.'
  } else if (!POSTAL_CODE_REGEX.test(codigoPostal)) {
    fieldErrors.codigo_postal = 'El código postal debe tener 5 dígitos.'
  }

  const paisId = parsePositiveInt(raw.pais)
  if (!paisId) fieldErrors.pais = 'Selecciona un país válido.'

  if (!direccionFiscal) {
    fieldErrors.direccion_fiscal = 'La dirección fiscal es obligatoria.'
  } else if (direccionFiscal.length > FULL_ADDRESS_MAX_LENGTH) {
    fieldErrors.direccion_fiscal = 'La dirección fiscal es demasiado larga.'
  }

  if (!direccionNotificacion) {
    fieldErrors.direccion_notificacion = 'La dirección de notificación es obligatoria.'
  } else if (direccionNotificacion.length > FULL_ADDRESS_MAX_LENGTH) {
    fieldErrors.direccion_notificacion = 'La dirección de notificación es demasiado larga.'
  }

  if (!actividad) fieldErrors.actividad = 'La actividad es obligatoria.'

  if (ingresosAnuales === null) {
    fieldErrors.ingresos_anuales = 'La estimación de ingresos anuales es obligatoria.'
  } else if (ingresosAnuales < MIN_ANNUAL_INCOME_EUR) {
    fieldErrors.ingresos_anuales = `La estimación debe ser igual o superior a ${MIN_ANNUAL_INCOME_EUR}.`
  }

  if (!iban) {
    fieldErrors.iban = 'El IBAN es obligatorio.'
  } else if (!isValidSpanishIban(iban)) {
    fieldErrors.iban = 'El IBAN no es válido.'
  }

  if (!privacidad) {
    fieldErrors.privacidad = 'Debes aceptar la política de privacidad.'
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors }
  }

  const isAlreadyAutonomo = yaEresAutonomo === 'si'

  return {
    ok: true,
    data: {
      firstName: nombre,
      lastName: apellidos,
      nifNie: nif,
      naf: naf || undefined,
      birthDate: fechaNacimiento,
      phone: telefono,
      email,
      hasDigitalCertificate: certificadoDigital === 'si',
      isAlreadyAutonomo,
      startedAutonomoAt: isAlreadyAutonomo ? fechaAlta : undefined,
      wantsStartWithUsAt: fechaEmpezarConNosotros,
      requestedAltaAt: isAlreadyAutonomo ? undefined : fechaDarAlta,
      wasAutonomoLast3Years: isAlreadyAutonomo
        ? undefined
        : fuisteAutonomo3Anos === 'si',
      previousAutonomoEndDate:
        !isAlreadyAutonomo && fuisteAutonomo3Anos === 'si' ? fechaBaja : undefined,
      activityAddress: direccion,
      city: ciudad,
      fiscalAddress: direccionFiscal,
      notificationAddress: direccionNotificacion,
      provinceId: provinciaId as number,
      postalCode: codigoPostal,
      countryId: paisId as number,
      activityDescription: actividad,
      annualIncomeEstimateEur: ingresosAnuales as number,
      iban,
      comments: comentarios || undefined,
      acceptsPrivacyPolicy: true,
    },
  }
}

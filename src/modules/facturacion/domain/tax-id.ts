import { isValidDni } from '@/lib/validation'

const CIF_LETTERS_WITH_LETTER_CONTROL = new Set(['K', 'P', 'Q', 'R', 'S', 'W', 'N'])
const CIF_LETTERS_WITH_DIGIT_CONTROL = new Set(['A', 'B', 'E', 'H'])
const CIF_CONTROL_LETTERS = 'JABCDEFGHI'

export function normalizeTaxId(value: string): string {
  return value.toUpperCase().replace(/[\s.-]/g, '')
}

/** Dígito de control de un CIF (7 cifras centrales), según el algoritmo de la Agencia Tributaria. */
function cifControlDigit(digits: string): number {
  let sum = 0
  for (let index = 0; index < 7; index += 1) {
    const digit = Number(digits[index])
    if (index % 2 === 0) {
      const doubled = digit * 2
      sum += Math.floor(doubled / 10) + (doubled % 10)
    } else {
      sum += digit
    }
  }
  return (10 - (sum % 10)) % 10
}

function isValidCif(value: string): boolean {
  const match = value.match(/^([A-HJ-NP-SUVW])(\d{7})([0-9A-J])$/)
  if (!match) return false
  const [, letter, digits, control] = match
  const expected = cifControlDigit(digits)
  const expectedLetter = CIF_CONTROL_LETTERS[expected]

  if (CIF_LETTERS_WITH_LETTER_CONTROL.has(letter)) return control === expectedLetter
  if (CIF_LETTERS_WITH_DIGIT_CONTROL.has(letter)) return control === String(expected)
  return control === String(expected) || control === expectedLetter
}

/** NIF/NIE de persona física o CIF de entidad, con comprobación del dígito de control. */
export function isValidSpanishTaxId(raw: string): boolean {
  const value = normalizeTaxId(raw)
  return isValidDni(value) || isValidCif(value)
}

/** NIF-IVA de otro país de la UE (prefijo de país y hasta 12 caracteres): no se puede verificar su control aquí. */
function looksLikeEuVatNumber(value: string): boolean {
  return /^[A-Z]{2}[A-Z0-9]{8,12}$/.test(value) && !value.startsWith('ES')
}

/** Identificación fiscal admisible en una factura: española verificada o NIF-IVA comunitario. */
export function isValidTaxId(raw: string): boolean {
  const value = normalizeTaxId(raw)
  return isValidSpanishTaxId(value) || looksLikeEuVatNumber(value)
}

/** Completa un CIF de ejemplo con su dígito de control (para datos de prueba coherentes). */
export function completeCif(letterAndDigits: string): string {
  const letter = letterAndDigits[0]
  const control = cifControlDigit(letterAndDigits.slice(1, 8))
  return CIF_LETTERS_WITH_LETTER_CONTROL.has(letter) ? `${letterAndDigits}${CIF_CONTROL_LETTERS[control]}` : `${letterAndDigits}${control}`
}

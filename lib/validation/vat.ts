import { dniControlLetter, normalizeDni } from '@/lib/validation/dni'

const CIF_RE = /^([ABCDEFGHJNPQRSUVW])([0-9]{7})([0-9A-J])$/
const CIF_CONTROL_LETTERS = 'JABCDEFGHI'
/** Entidades cuyo control es siempre una letra / siempre un dígito (resto: cualquiera). */
const CIF_LETTER_ONLY = new Set(['K', 'P', 'Q', 'R', 'S', 'N', 'W'])
const CIF_DIGIT_ONLY = new Set(['A', 'B', 'E', 'H'])

/** NIF, NIE o CIF (contacto fiscal / res.partner.vat). */
function normalizeVat(value: string): string {
  return normalizeDni(value)
}

function isValidCifControl(letter: string, digits: string, control: string): boolean {
  let sum = 0
  for (let i = 0; i < digits.length; i += 1) {
    const digit = Number(digits[i])
    if (i % 2 === 0) {
      const doubled = digit * 2
      sum += Math.floor(doubled / 10) + (doubled % 10)
    } else {
      sum += digit
    }
  }
  const expectedDigit = (10 - (sum % 10)) % 10
  const expectedLetter = CIF_CONTROL_LETTERS[expectedDigit]

  if (CIF_LETTER_ONLY.has(letter)) return control === expectedLetter
  if (CIF_DIGIT_ONLY.has(letter)) return control === String(expectedDigit)
  return control === String(expectedDigit) || control === expectedLetter
}

/** NIF/NIE con letra de control válida, o CIF con su dígito/letra de control válido. */
export function isValidVat(value: string): boolean {
  const normalized = normalizeVat(value)

  const dniLetter = dniControlLetter(normalized)
  if (dniLetter !== null) return normalized.endsWith(dniLetter)

  const cif = CIF_RE.exec(normalized)
  if (!cif) return false
  return isValidCifControl(cif[1], cif[2], cif[3])
}

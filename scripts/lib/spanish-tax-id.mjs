/**
 * Comprobación de NIF / NIE / CIF para los scripts de auditoría (Node puro, sin
 * TypeScript). Es la MISMA regla que `lib/validation/dni.ts` y `vat.ts`: un test
 * (`lib/validation/spanish-tax-id-script-sync.test.ts`) la contrasta con
 * `isValidVat` para que no se desincronicen.
 */

const DNI_CONTROL_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE'
const NIE_PREFIX_DIGIT = { X: '0', Y: '1', Z: '2' }
const CIF_RE = /^([ABCDEFGHJNPQRSUVW])([0-9]{7})([0-9A-J])$/
const CIF_CONTROL_LETTERS = 'JABCDEFGHI'
const CIF_LETTER_ONLY = new Set(['K', 'P', 'Q', 'R', 'S', 'N', 'W'])
const CIF_DIGIT_ONLY = new Set(['A', 'B', 'E', 'H'])

export function normalizeTaxId(value) {
  return String(value ?? '').replace(/\s+/g, '').toUpperCase()
}

function dniControlLetter(normalized) {
  const match = /^([XYZ]|[0-9])([0-9]{7})[A-Z]$/.exec(normalized)
  if (!match) return null
  const digits = `${NIE_PREFIX_DIGIT[match[1]] ?? match[1]}${match[2]}`
  return DNI_CONTROL_LETTERS[Number(digits) % 23]
}

function cifControlOk(letter, digits, control) {
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

/** ¿Pasa la validación de la app (formato y control)? Igual que `isValidVat`. */
export function isValidSpanishTaxId(value) {
  const normalized = normalizeTaxId(value)
  const letter = dniControlLetter(normalized)
  if (letter !== null) return normalized.endsWith(letter)
  const cif = CIF_RE.exec(normalized)
  return cif ? cifControlOk(cif[1], cif[2], cif[3]) : false
}

/**
 * Clasifica un valor guardado para la auditoría. Un prefijo de país `ES` se
 * ignora (Odoo lo guarda así); otro prefijo de país se marca como extranjero y
 * no se juzga.
 */
export function classifyStoredTaxId(raw) {
  const normalized = normalizeTaxId(raw)
  if (!normalized) return { status: 'vacio', normalized }

  const foreign = /^([A-Z]{2})(?=[A-Z0-9])/.exec(normalized)
  const withoutCountry =
    foreign && foreign[1] === 'ES' && normalized.length > 9 ? normalized.slice(2) : normalized
  if (foreign && foreign[1] !== 'ES' && !/^[XYZ][0-9]/.test(normalized)) {
    // Dos letras iniciales que no son ES: casi seguro un identificador de otro país.
    if (!CIF_RE.test(normalized) && dniControlLetter(normalized) === null) {
      return { status: 'extranjero', normalized }
    }
  }

  if (isValidSpanishTaxId(withoutCountry)) return { status: 'ok', normalized: withoutCountry }

  const letter = dniControlLetter(withoutCountry)
  if (letter !== null) {
    return {
      status: 'control_incorrecto',
      normalized: withoutCountry,
      detail: `letra esperada ${letter}`,
    }
  }
  const cif = CIF_RE.exec(withoutCountry)
  if (cif) {
    return { status: 'control_incorrecto', normalized: withoutCountry, detail: 'dígito/letra de control del CIF' }
  }
  // Con pinta de intento de NIF/NIE/CIF español (p. ej. falta una cifra): error de
  // datos. Cualquier otra cosa (solo números, otros países...) no se juzga.
  const looksSpanish =
    /^[0-9]{7,8}[A-Z]$/.test(withoutCountry) ||
    /^[XYZ][0-9]{6,7}[A-Z]$/.test(withoutCountry) ||
    /^[ABCDEFGHJNPQRSUVW][0-9]{6,8}[0-9A-Z]?$/.test(withoutCountry)
  return looksSpanish
    ? { status: 'formato_invalido', normalized: withoutCountry }
    : { status: 'otro_formato', normalized: withoutCountry }
}

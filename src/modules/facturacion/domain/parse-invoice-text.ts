import { parseAmountToCents } from '@/src/modules/facturacion/domain/money'
import type { TaxRegime } from '@/src/modules/facturacion/domain/types'

/**
 * Lo que se logra leer del texto de una factura. Todo es una sugerencia: cada
 * campo puede quedar a `null` y la persona lo revisa antes de guardar.
 */
export type ParsedInvoice = {
  invoiceNumber: string | null
  issueDate: string | null
  dueDate: string | null
  counterpartyName: string | null
  counterpartyTaxId: string | null
  regime: TaxRegime | null
  baseCents: number | null
  taxRate: number | null
  totalCents: number | null
  withholdingRate: number | null
}

/** Campos que cuentan para decir cuánto se ha entendido de la factura. */
export const PARSED_FIELD_KEYS = [
  'invoiceNumber',
  'issueDate',
  'counterpartyName',
  'counterpartyTaxId',
  'baseCents',
  'taxRate',
  'totalCents',
] as const satisfies readonly (keyof ParsedInvoice)[]

export function countParsedFields(parsed: ParsedInvoice): number {
  return PARSED_FIELD_KEYS.filter((key) => parsed[key] !== null).length
}

const TAX_ID_PATTERN = /\b(?:[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]|\d{8}[A-Z]|[XYZ]\d{7}[A-Z])\b/g
const AMOUNT_PATTERN = /-?\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|-?\d+(?:[.,]\d{1,2})?/g
const PERCENT_PATTERN = /(\d{1,2}(?:[.,]\d{1,2})?)\s*%/

const MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

function normalizeTaxId(value: string): string {
  return value.toUpperCase().replace(/[\s.-]/g, '')
}

function toIsoDate(year: number, month: number, day: number): string | null {
  const fullYear = year < 100 ? 2000 + year : year
  const date = new Date(Date.UTC(fullYear, month - 1, day))
  if (
    date.getUTCFullYear() !== fullYear ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }
  return date.toISOString().slice(0, 10)
}

/** Primera fecha válida de una línea: `12/03/2026`, `12-03-26`, `2026-03-12` o `12 de marzo de 2026`. */
export function findDateInText(text: string): string | null {
  const patterns: Array<{ regex: RegExp; read: (m: RegExpMatchArray) => string | null }> = [
    {
      regex: /\b(\d{4})-(\d{2})-(\d{2})\b/g,
      read: (m) => toIsoDate(Number(m[1]), Number(m[2]), Number(m[3])),
    },
    {
      regex: /\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4}|\d{2})\b/g,
      read: (m) => toIsoDate(Number(m[3]), Number(m[2]), Number(m[1])),
    },
    {
      regex: /\b(\d{1,2})\s+de\s+([a-záéíóú]+)\s+de(?:l)?\s+(\d{4})\b/gi,
      read: (m) => {
        const month = MONTHS.indexOf(m[2].toLowerCase()) + 1
        return month > 0 ? toIsoDate(Number(m[3]), month, Number(m[1])) : null
      },
    },
  ]

  let earliestIndex = Infinity
  let found: string | null = null
  for (const { regex, read } of patterns) {
    for (const match of text.matchAll(regex)) {
      const iso = read(match)
      if (iso && (match.index ?? 0) < earliestIndex) {
        earliestIndex = match.index ?? 0
        found = iso
      }
    }
  }
  return found
}

function splitLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

function stripPercentages(line: string): string {
  return line.replace(/\d{1,2}(?:[.,]\d{1,2})?\s*%/g, ' ')
}

/** Importes de una línea, sin contar los porcentajes. */
function amountsIn(line: string): number[] {
  const matches = stripPercentages(line).match(AMOUNT_PATTERN) ?? []
  return matches
    .map((raw) => parseAmountToCents(raw))
    .filter((cents): cents is number => cents !== null)
}

/** Importe de la primera línea que cumpla `label`; si esa línea no lleva importe, el de la siguiente. */
function amountAfterLabel(
  lines: string[],
  label: RegExp,
  options: { exclude?: RegExp; pick?: 'first' | 'last' } = {}
): number | null {
  const candidates: number[] = []
  lines.forEach((line, index) => {
    if (!label.test(line) || options.exclude?.test(line)) return
    const own = amountsIn(line)
    const amounts = own.length > 0 ? own : amountsIn(lines[index + 1] ?? '')
    if (amounts.length > 0) candidates.push(amounts[amounts.length - 1])
  })
  if (candidates.length === 0) return null
  return options.pick === 'last' ? candidates[candidates.length - 1] : candidates[0]
}

function findPercentOnLabelLine(lines: string[], label: RegExp): number | null {
  for (const line of lines) {
    if (!label.test(line)) continue
    const match = line.match(PERCENT_PATTERN)
    if (match) return Number(match[1].replace(',', '.'))
  }
  return null
}

const INVOICE_NUMBER_CANDIDATE = '(?=[A-Z0-9/\\-._]*\\d)([A-Z0-9][A-Z0-9/\\-._]*)(?![\\w,])'
const DATE_LIKE = /^\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}$/

/** Con marcador explícito («Nº», «Número de factura», «Invoice no.»…) es fiable en cualquier línea. */
const MARKED_NUMBER = new RegExp(
  '(?<![a-záéíóú])(?:n[úu]mero(?:\\s+de\\s+factura)?|n[º°o]\\.?|n\\.º|n[úu]m\\.?|(?:factura|fra\\.?)\\s*(?:n[úu]m(?:ero)?\\.?|n[º°o]\\.?)|invoice\\s*(?:no\\.?|number|#))\\s*[:#]?\\s*' +
    INVOICE_NUMBER_CANDIDATE,
  'gi'
)

/** Sin marcador, «Factura 2026-014» pegado; solo en líneas que no hablen de importes o fechas. */
const BARE_NUMBER = new RegExp(
  '(?<![a-záéíóú])(?:factura|fra\\.?)\\s*[:#]?\\s*' + INVOICE_NUMBER_CANDIDATE,
  'gi'
)
const NOT_A_NUMBER_LINE = /total|fecha|importe|base|vencimiento|\bpago\b/i

function firstValidNumber(text: string, pattern: RegExp): string | null {
  for (const match of text.matchAll(pattern)) {
    const candidate = match[1].replace(/[.,;]+$/, '')
    if (candidate.length >= 3 && !DATE_LIKE.test(candidate)) return candidate
  }
  return null
}

function findInvoiceNumber(lines: string[]): string | null {
  for (const line of lines) {
    const marked = firstValidNumber(line, MARKED_NUMBER)
    if (marked) return marked
  }
  for (const line of lines) {
    if (NOT_A_NUMBER_LINE.test(line)) continue
    const bare = firstValidNumber(line, BARE_NUMBER)
    if (bare) return bare
  }
  return null
}

function findCounterpartyName(lines: string[], taxId: string | null): string | null {
  const skip = /factura|fecha|cliente|total|iva|igic|base|importe|retenci|irpf|n[º°.]|vencimiento|pago|descripci/i
  for (const line of lines) {
    const cleaned = taxId
      ? line.replace(new RegExp(taxId.split('').join('[\\s.-]?'), 'i'), '').replace(/\b(?:CIF|NIF|DNI)\b[:\s-]*/gi, '')
      : line
    const text = cleaned.replace(/[\s,;:-]+$/g, '').trim()
    if (text.length < 3 || text.length > 80) continue
    if (/\d/.test(text) || skip.test(text)) continue
    return text
  }
  return null
}

/**
 * Lee el texto de una factura (ya extraído del PDF) y propone sus datos. Se
 * apoya en etiquetas habituales («Base imponible», «IGIC 7 %», «Total»…); una
 * factura muy distinta simplemente dejará más campos a `null`.
 */
export function parseInvoiceText(text: string, options: { ownTaxId?: string } = {}): ParsedInvoice {
  const lines = splitLines(text)
  const own = options.ownTaxId ? normalizeTaxId(options.ownTaxId) : null

  const taxIds = [...text.matchAll(TAX_ID_PATTERN)].map((match) => normalizeTaxId(match[0]))
  const counterpartyTaxId = taxIds.find((id) => id !== own) ?? null

  const hasIgic = /\bigic\b/i.test(text)
  const hasIva = /\bi\.?\s?v\.?\s?a\.?\b/i.test(text)
  const regime: TaxRegime | null = hasIgic ? 'igic' : hasIva ? 'iva' : null

  const dateLine = lines.find(
    (line) => /fecha/i.test(line) && !/vencimiento/i.test(line) && findDateInText(line)
  )
  const issueDate = dateLine ? findDateInText(dateLine) : findDateInText(text)

  const taxLabel = /\b(igic|i\.?\s?v\.?\s?a\.?)\b/i
  const taxRate = findPercentOnLabelLine(lines, taxLabel)
  const withholdingRate = findPercentOnLabelLine(lines, /retenci[oó]n|\birpf\b/i)

  let baseCents = amountAfterLabel(lines, /base imponible|sub\s?total|\bbase\b/i)
  let totalCents = amountAfterLabel(lines, /\btotal\b/i, {
    exclude: /sub\s?total|total base|base imponible/i,
    pick: 'last',
  })

  // Con base y tipo (o total y tipo) se completa lo que falte.
  if (baseCents === null && totalCents !== null && taxRate !== null && withholdingRate === null) {
    baseCents = Math.round(totalCents / (1 + taxRate / 100))
  }
  if (totalCents === null && baseCents !== null && taxRate !== null && withholdingRate === null) {
    totalCents = baseCents + Math.round((baseCents * Math.round(taxRate * 10)) / 1000)
  }

  const dueLine = lines.find((line) => /vencimiento|vence\b/i.test(line) && findDateInText(line))
  const dueDate = dueLine ? findDateInText(dueLine) : null

  return {
    invoiceNumber: findInvoiceNumber(lines),
    issueDate,
    dueDate: dueDate && issueDate && dueDate >= issueDate ? dueDate : null,
    counterpartyName: findCounterpartyName(lines, counterpartyTaxId),
    counterpartyTaxId,
    regime,
    baseCents,
    taxRate,
    totalCents,
    withholdingRate,
  }
}

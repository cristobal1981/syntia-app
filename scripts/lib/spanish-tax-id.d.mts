export function normalizeTaxId(value: unknown): string
export function isValidSpanishTaxId(value: unknown): boolean
export function classifyStoredTaxId(raw: unknown): {
  status: 'vacio' | 'ok' | 'extranjero' | 'otro_formato' | 'control_incorrecto' | 'formato_invalido'
  normalized: string
  detail?: string
}

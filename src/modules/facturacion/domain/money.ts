const euroFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  // es-ES no agrupa los miles en cifras de 4 dígitos; en una tabla contable alinea mejor con el punto.
  useGrouping: 'always',
})

export function formatCents(cents: number): string {
  return euroFormatter.format(cents / 100)
}

/** `12,5` → 1250. Admite coma o punto decimal; devuelve `null` si no es un importe. */
export function parseAmountToCents(raw: string): number | null {
  const cleaned = raw.trim().replace(/[€\s]/g, '')
  if (!/^-?[\d.,]+$/.test(cleaned) || !/\d/.test(cleaned)) return null

  const negative = cleaned.startsWith('-')
  const unsigned = negative ? cleaned.slice(1) : cleaned
  const lastComma = unsigned.lastIndexOf(',')
  const lastDot = unsigned.lastIndexOf('.')
  const dotCount = unsigned.split('.').length - 1

  let decimalSeparator: ',' | '.' | null = null
  if (lastComma >= 0 && lastDot >= 0) {
    decimalSeparator = lastComma > lastDot ? ',' : '.'
  } else if (lastComma >= 0) {
    decimalSeparator = ','
  } else if (lastDot >= 0 && dotCount === 1 && unsigned.length - lastDot - 1 !== 3) {
    // «12.5» y «12.50» son decimales; «1.234» y «1.234.567» son miles.
    decimalSeparator = '.'
  }

  let normalized = unsigned
  if (decimalSeparator === ',') {
    normalized = unsigned.replace(/\./g, '').replace(',', '.')
  } else if (decimalSeparator === '.') {
    normalized = unsigned.replace(/,/g, '')
  } else {
    normalized = unsigned.replace(/[.,]/g, '')
  }

  const value = Number(normalized)
  if (!Number.isFinite(value)) return null
  const cents = Math.round(value * 100)
  return negative ? -cents : cents
}

/** Porcentaje sobre céntimos con redondeo al céntimo (admite tipos como 9,5 %). */
export function percentOfCents(cents: number, percent: number): number {
  // Redondeo simétrico: el abono de una factura debe ser exactamente su negativo.
  const magnitude = Math.round((Math.abs(cents) * Math.round(percent * 10)) / 1000)
  return cents < 0 ? -magnitude : magnitude
}

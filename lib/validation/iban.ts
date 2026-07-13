export function normalizeIban(value: string): string {
  return value.replace(/\s/g, '').toUpperCase()
}

export function isValidSpanishIban(value: string): boolean {
  const iban = normalizeIban(value)
  if (!/^ES[0-9]{22}$/.test(iban)) return false

  const rearranged = iban.slice(4) + iban.slice(0, 4)
  const numeric = rearranged
    .split('')
    .map((char) => {
      const code = char.charCodeAt(0)
      if (code >= 65 && code <= 90) return String(code - 55)
      return char
    })
    .join('')

  let remainder = 0
  for (const digit of numeric) {
    remainder = (remainder * 10 + Number(digit)) % 97
  }

  return remainder === 1
}

export function maskIban(iban: string): string {
  const normalized = normalizeIban(iban)
  if (normalized.length < 8) return iban
  const visible = normalized.slice(-4)
  return `${normalized.slice(0, 2)}** **** **** **** ${visible}`
}

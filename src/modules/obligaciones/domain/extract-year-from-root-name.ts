export function extractYearFromRootName(name: string): number | null {
  const bracketMatch = name.match(/\[(\d{4})\]/)
  if (bracketMatch) {
    return Number.parseInt(bracketMatch[1], 10)
  }

  const trailingYear = name.match(/(\d{4})\s*$/)
  if (trailingYear) {
    return Number.parseInt(trailingYear[1], 10)
  }

  return null
}

export function trim(value: string): string {
  return value.trim()
}

export function normalizeUpperNoSpaces(value: string): string {
  return trim(value).toUpperCase().replace(/\s/g, '')
}

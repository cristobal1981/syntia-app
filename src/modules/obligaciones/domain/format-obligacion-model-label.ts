export function formatObligacionModelLabel(fullName: string): string {
  const withoutClient = fullName.replace(/\s+-\s+[^-]+$/, '').trim()
  const modelMatch = withoutClient.match(/^(Modelo\s+\d+)/i)

  if (modelMatch) {
    return modelMatch[1]
  }

  return withoutClient || fullName
}

import {
  fiscalModelsGuide,
  type FiscalModelGuideEntry,
} from '@/content/fiscal-models-guide'

export function normalizeGuideSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
}

export function extractModelCodeFromLabel(label: string): string | null {
  const match = label.match(/Modelo\s+(\d+)/i)
  return match?.[1] ?? null
}

export function getFiscalModelGuideByCode(
  code: string
): FiscalModelGuideEntry | undefined {
  return fiscalModelsGuide.models.find((entry) => entry.code === code)
}

export function getFiscalModelGuideByLabel(
  label: string
): FiscalModelGuideEntry | undefined {
  const code = extractModelCodeFromLabel(label)
  if (!code) return undefined
  return getFiscalModelGuideByCode(code)
}

export function fiscalModelMatchesQuery(
  entry: FiscalModelGuideEntry,
  query: string
): boolean {
  const normalizedQuery = normalizeGuideSearchText(query.trim())
  if (!normalizedQuery) return true

  const haystack = normalizeGuideSearchText(
    [
      entry.label,
      entry.title,
      entry.description,
      entry.code,
      ...entry.tags,
      ...entry.keywords,
    ].join(' ')
  )

  if (haystack.includes(normalizedQuery)) return true

  return [...entry.tags, ...entry.keywords].some((keyword) =>
    normalizeGuideSearchText(keyword).includes(normalizedQuery)
  )
}

export function modelLabelMatchesGuideQuery(
  modelLabel: string,
  query: string
): boolean {
  const normalizedQuery = normalizeGuideSearchText(query.trim())
  if (!normalizedQuery) return true

  if (normalizeGuideSearchText(modelLabel).includes(normalizedQuery)) return true

  const entry = getFiscalModelGuideByLabel(modelLabel)
  if (!entry) return false

  return fiscalModelMatchesQuery(entry, query)
}

export function getSortedFiscalModelGuideEntries(): FiscalModelGuideEntry[] {
  return [...fiscalModelsGuide.models].sort(
    (a, b) => Number.parseInt(a.code, 10) - Number.parseInt(b.code, 10)
  )
}

export function formatKeywordHashtag(keyword: string): string {
  const slug = keyword.replace(/\s+/g, '')
  return slug.startsWith('#') ? slug : `#${slug}`
}

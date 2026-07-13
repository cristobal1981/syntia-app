import type { PortalSearchItem } from '@/src/modules/portal/domain/portal-search-types'

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
}

function matchesQuery(item: PortalSearchItem, query: string): boolean {
  if (!query) return true

  const normalized = normalizeSearchText(query)
  const haystack = [
    item.label,
    item.description ?? '',
    ...item.keywords,
  ]
    .map(normalizeSearchText)
    .join(' ')

  return haystack.includes(normalized)
}

export function filterPortalSearchItems(
  items: PortalSearchItem[],
  query: string
): PortalSearchItem[] {
  const trimmed = query.trim()
  if (!trimmed) return items

  return items.filter((item) => matchesQuery(item, trimmed))
}

export function getPortalSearchSuggestions(
  items: PortalSearchItem[],
  limit = 5
): PortalSearchItem[] {
  return items.slice(0, limit)
}

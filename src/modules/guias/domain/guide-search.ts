import { guias, type GuideCategoryId, type GuideEntry } from '@/content/guias'
import { normalizeGuideSearchText } from '@/src/modules/obligaciones/domain/fiscal-model-guide'

export function guideMatchesQuery(entry: GuideEntry, query: string): boolean {
  const normalizedQuery = normalizeGuideSearchText(query.trim())
  if (!normalizedQuery) return true

  const haystack = normalizeGuideSearchText(
    [
      entry.title,
      entry.description,
      ...entry.tags,
      ...entry.keywords,
      ...(entry.relatedModelCodes ?? []),
    ].join(' ')
  )

  return haystack.includes(normalizedQuery)
}

export function getGuideBySlug(slug: string): GuideEntry | undefined {
  return guias.entries.find((entry) => entry.slug === slug)
}

export function getGuidesForWindowSlugs(
  slugs: readonly string[]
): GuideEntry[] {
  return slugs
    .map((slug) => getGuideBySlug(slug))
    .filter((entry): entry is GuideEntry => entry !== undefined)
}

export type GuideCategoryGroup = {
  category: GuideCategoryId
  label: string
  entries: GuideEntry[]
}

/** Agrupa las guías por categoría siguiendo el orden de guias.categories */
export function getGuidesByCategory(): GuideCategoryGroup[] {
  const categoryIds = Object.keys(guias.categories) as GuideCategoryId[]

  return categoryIds
    .map((category) => ({
      category,
      label: guias.categories[category],
      entries: guias.entries.filter((entry) => entry.category === category),
    }))
    .filter((group) => group.entries.length > 0)
}

import { formatObligacionModelLabel } from '@/src/modules/obligaciones/domain/format-obligacion-model-label'
import {
  modelLabelMatchesGuideQuery,
  normalizeGuideSearchText,
} from '@/src/modules/obligaciones/domain/fiscal-model-guide'
import type { ObligacionListRow } from '@/src/modules/obligaciones/domain/sort-obligaciones-list'

export function filterObligacionListRows(
  rows: ObligacionListRow[],
  query: string,
  selectedModel?: string | null
): ObligacionListRow[] {
  let result = rows

  const modelFilter = selectedModel?.trim()
  if (modelFilter) {
    const target = modelFilter.toLowerCase()
    result = result.filter(
      (row) => formatObligacionModelLabel(row.name).toLowerCase() === target
    )
  }

  const normalizedQuery = normalizeGuideSearchText(query.trim())
  if (!normalizedQuery) return result

  return result.filter((row) => {
    const modelLabel = formatObligacionModelLabel(row.name)
    const periodLabel = normalizeGuideSearchText(row.periodLabel)
    const fullName = normalizeGuideSearchText(row.name)

    return (
      modelLabelMatchesGuideQuery(modelLabel, query) ||
      periodLabel.includes(normalizedQuery) ||
      fullName.includes(normalizedQuery)
    )
  })
}

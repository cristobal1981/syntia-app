import { formatObligacionModelLabel } from '@/src/modules/obligaciones/domain/format-obligacion-model-label'
import {
  modelLabelMatchesGuideQuery,
  normalizeGuideSearchText,
} from '@/src/modules/obligaciones/domain/fiscal-model-guide'
import type { ObligacionListRow } from '@/src/modules/obligaciones/domain/sort-obligaciones-list'

export function filterObligacionListRows(
  rows: ObligacionListRow[],
  query: string
): ObligacionListRow[] {
  const normalizedQuery = normalizeGuideSearchText(query.trim())
  if (!normalizedQuery) return rows

  return rows.filter((row) => {
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

export function filterObligacionModelLabels(
  modelLabels: string[],
  query: string
): string[] {
  const normalizedQuery = normalizeGuideSearchText(query.trim())
  if (!normalizedQuery) return modelLabels

  return modelLabels.filter((modelLabel) =>
    modelLabelMatchesGuideQuery(modelLabel, query)
  )
}

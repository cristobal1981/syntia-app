import { formatObligacionModelLabel } from '@/src/modules/obligaciones/domain/format-obligacion-model-label'
import {
  sortObligacionListRows,
  type ObligacionListRow,
} from '@/src/modules/obligaciones/domain/sort-obligaciones-list'

export type ObligacionModelGroup<T extends ObligacionListRow = ObligacionListRow> = {
  modelLabel: string
  entries: T[]
}

export function groupObligacionesByModel<T extends ObligacionListRow>(
  rows: T[]
): ObligacionModelGroup<T>[] {
  const groups = new Map<string, T[]>()

  for (const row of rows) {
    const modelLabel = formatObligacionModelLabel(row.name)
    const entries = groups.get(modelLabel) ?? []
    entries.push(row)
    groups.set(modelLabel, entries)
  }

  return [...groups.entries()]
    .map(([modelLabel, entries]) => ({
      modelLabel,
      entries: sortObligacionListRows(entries, 'period', 'asc'),
    }))
    .sort((a, b) => a.modelLabel.localeCompare(b.modelLabel, 'es'))
}

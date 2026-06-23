import { formatObligacionModelLabel } from '@/src/modules/obligaciones/domain/format-obligacion-model-label'
import { flattenObligacionesYear } from '@/src/modules/obligaciones/domain/sort-obligaciones-list'
import type { ObligacionesSnapshot } from '@/src/modules/obligaciones/domain/types'

function extractModelNumber(label: string): number | null {
  const match = label.match(/Modelo\s+(\d+)/i)
  return match ? Number.parseInt(match[1], 10) : null
}

export function collectClientObligacionModels(
  snapshot: ObligacionesSnapshot
): string[] {
  const models = new Set<string>()

  for (const year of snapshot.years) {
    for (const row of flattenObligacionesYear(year)) {
      models.add(formatObligacionModelLabel(row.name))
    }
  }

  return [...models].sort((a, b) => {
    const numberA = extractModelNumber(a)
    const numberB = extractModelNumber(b)

    if (numberA !== null && numberB !== null && numberA !== numberB) {
      return numberA - numberB
    }

    return a.localeCompare(b, 'es')
  })
}

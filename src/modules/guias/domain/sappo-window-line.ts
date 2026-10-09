import { guias } from '@/content/guias'
import type { RelevantTaxWindow } from '@/src/modules/guias/domain/tax-calendar'

const copy = guias.hub.sappo
const MAX_CODES = 3

function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''))
}

function subjectOf({ window }: RelevantTaxWindow): string {
  const { modelCodes, title } = window
  if (modelCodes.length === 0) return title

  const shown = modelCodes.slice(0, MAX_CODES).join(', ')
  const rest = modelCodes.length - MAX_CODES
  const codes = rest > 0 ? `${shown} ${fill(copy.moreModels, { count: rest })}` : shown
  return fill(modelCodes.length === 1 ? copy.oneModel : copy.manyModels, { codes })
}

/** Frase de Sappo sobre el plazo más urgente (la lista ya viene ordenada). */
export function sappoWindowLine(relevant: RelevantTaxWindow | undefined): string | null {
  if (!relevant) return null
  const subject = subjectOf(relevant)

  if (relevant.status === 'active') {
    const days = relevant.daysUntilEnd
    if (days <= 0) return fill(copy.activeToday, { subject })
    if (days === 1) return fill(copy.activeOne, { subject })
    return fill(copy.activeMany, { subject, days })
  }

  const days = relevant.daysUntilStart
  if (days <= 1) return fill(copy.upcomingOne, { subject })
  return fill(copy.upcomingMany, { subject, days })
}

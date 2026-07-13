export const SIGNATURE_DUE_SOON_DAYS = 7

export function formatSignatureDate(value?: string): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function formatSignatureDateCompact(value?: string): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function getDaysUntilSignatureDue(dueDate?: string): number | null {
  if (!dueDate) return null
  const due = new Date(dueDate)
  if (Number.isNaN(due.getTime())) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)

  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export function isSignatureDueSoon(dueDate?: string): boolean {
  const days = getDaysUntilSignatureDue(dueDate)
  if (days === null) return false
  return days >= 0 && days <= SIGNATURE_DUE_SOON_DAYS
}

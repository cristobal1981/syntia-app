const MONTH_ABBREVIATIONS = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
]

function pad2(value: number): string {
  return value < 10 ? `0${value}` : `${value}`
}

/** "05 mar 2026" */
export function formatOnboardingDateLong(value: string): string {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return '—'
  const day = pad2(date.getDate())
  const month = MONTH_ABBREVIATIONS[date.getMonth()]
  const year = date.getFullYear()
  return `${day} ${month} ${year}`
}

/** "05/03/2026" */
export function formatOnboardingDateNumeric(value: string): string {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return '—'
  const day = pad2(date.getDate())
  const month = pad2(date.getMonth() + 1)
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

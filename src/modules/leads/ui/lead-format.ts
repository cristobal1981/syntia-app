const euroFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

export function formatEuro(value: number): string {
  return euroFormatter.format(value)
}

export function formatPct(value: number): string {
  return `${value.toFixed(0)}%`
}

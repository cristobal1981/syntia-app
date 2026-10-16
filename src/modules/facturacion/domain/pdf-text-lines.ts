export type PdfTextItem = { str: string; x: number; y: number }

/** Tolerancia vertical (en unidades PDF) para considerar que dos trozos están en la misma línea. */
const LINE_TOLERANCE = 3

/**
 * Recompone las líneas de una página a partir de los trozos de texto que da
 * pdf.js: de arriba abajo y, dentro de cada línea, de izquierda a derecha.
 */
export function groupTextItemsIntoLines(items: PdfTextItem[]): string[] {
  const rows: Array<{ y: number; items: PdfTextItem[] }> = []

  for (const item of items) {
    if (!item.str.trim()) continue
    const row = rows.find((candidate) => Math.abs(candidate.y - item.y) <= LINE_TOLERANCE)
    if (row) row.items.push(item)
    else rows.push({ y: item.y, items: [item] })
  }

  return rows
    .sort((a, b) => b.y - a.y)
    .map((row) =>
      row.items
        .sort((a, b) => a.x - b.x)
        .map((item) => item.str.trim())
        .join(' ')
    )
}

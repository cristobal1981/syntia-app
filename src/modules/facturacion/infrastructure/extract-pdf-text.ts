import { groupTextItemsIntoLines, type PdfTextItem } from '@/src/modules/facturacion/domain/pdf-text-lines'

/** Las facturas caben en una o dos páginas; más allá solo hay condiciones y letra pequeña. */
const MAX_PAGES = 3

/**
 * Extrae el texto de un PDF en el navegador con pdf.js. Un PDF escaneado
 * (solo imagen) devuelve cadena vacía: haría falta OCR, que queda fuera del mock.
 */
export async function extractPdfText(file: Blob): Promise<string> {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString()

  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) })
  try {
    const document = await task.promise
    const pages: string[] = []
    for (let number = 1; number <= Math.min(document.numPages, MAX_PAGES); number += 1) {
      const page = await document.getPage(number)
      const content = await page.getTextContent()
      const items: PdfTextItem[] = []
      for (const item of content.items) {
        if (!('str' in item)) continue
        items.push({ str: item.str, x: item.transform[4], y: item.transform[5] })
      }
      pages.push(groupTextItemsIntoLines(items).join('\n'))
    }
    return pages.join('\n')
  } finally {
    await task.destroy()
  }
}

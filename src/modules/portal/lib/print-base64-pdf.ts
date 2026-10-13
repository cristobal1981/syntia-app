/** Abre el diálogo de impresión del navegador con un PDF que ya tenemos en memoria. */
export function printBase64Pdf(dataBase64: string): void {
  const binary = atob(dataBase64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }))

  const frame = document.createElement('iframe')
  frame.style.position = 'fixed'
  frame.style.width = '0'
  frame.style.height = '0'
  frame.style.border = '0'
  frame.src = url

  const cleanup = () => {
    frame.remove()
    URL.revokeObjectURL(url)
  }

  frame.onload = () => {
    try {
      frame.contentWindow?.focus()
      frame.contentWindow?.print()
    } finally {
      // El diálogo de impresión es bloqueante en la mayoría de navegadores; si no, damos margen.
      window.setTimeout(cleanup, 60_000)
    }
  }
  document.body.appendChild(frame)
}

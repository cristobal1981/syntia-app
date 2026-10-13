import { useEffect, useState } from 'react'

import { isExternalFileDrag } from '@/src/modules/documents/ui/drive-drag'

/**
 * Detecta un arrastre de ficheros externos (del escritorio) sobre TODA la
 * página — no solo sobre `DriveBrowser` — para poder mostrar el overlay de
 * "suelta aquí" en cuanto el cursor entra en la ventana, no solo al pasar
 * por encima del propio componente.
 */
export function useExternalFileDragOverlay(enabled: boolean) {
  const [pageDragDepth, setPageDragDepth] = useState(0)

  useEffect(() => {
    if (!enabled) return

    const onDragEnter = (event: DragEvent) => {
      if (!isExternalFileDrag(event)) return
      event.preventDefault()
      setPageDragDepth((depth) => depth + 1)
    }

    const onDragLeave = (event: DragEvent) => {
      if (!isExternalFileDrag(event)) return
      setPageDragDepth((depth) => Math.max(0, depth - 1))
    }

    const onDragOver = (event: DragEvent) => {
      if (!isExternalFileDrag(event)) return
      event.preventDefault()
    }

    const onDrop = (event: DragEvent) => {
      if (!isExternalFileDrag(event)) return
      event.preventDefault()
      setPageDragDepth(0)
    }

    window.addEventListener('dragenter', onDragEnter)
    window.addEventListener('dragleave', onDragLeave)
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('drop', onDrop)

    return () => {
      window.removeEventListener('dragenter', onDragEnter)
      window.removeEventListener('dragleave', onDragLeave)
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('drop', onDrop)
    }
  }, [enabled])

  return {
    pageDragActive: pageDragDepth > 0,
    resetPageDrag: () => setPageDragDepth(0),
  }
}

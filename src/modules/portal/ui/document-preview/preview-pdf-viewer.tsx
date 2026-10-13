'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist'

import { portalDocuments } from '@/content/portal-documents'
import { usePreviewClose } from '@/src/modules/portal/ui/document-preview/preview-dialog-layout'
import {
  DEFAULT_ZOOM_INDEX,
  PreviewZoomControls,
  ZOOM_STEPS,
} from '@/src/modules/portal/ui/document-preview/preview-zoom-controls'

const MAX_PAGE_WIDTH = 900
const SIDE_GUTTER = 32

type PageSize = { width: number; height: number }

function base64ToBytes(dataBase64: string): Uint8Array {
  const binary = atob(dataBase64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

type PdfPageProps = {
  pdf: PDFDocumentProxy
  pageNumber: number
  size: PageSize
  cssWidth: number
  registerRef: (pageNumber: number, node: HTMLDivElement | null) => void
}

/** Una página: el lienzo solo se dibuja cuando está cerca de la zona visible. */
function PdfPage({ pdf, pageNumber, size, cssWidth, registerRef }: PdfPageProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [near, setNear] = useState(false)
  const cssHeight = (cssWidth * size.height) / size.width

  useEffect(() => {
    const node = wrapperRef.current
    if (!node) return
    const observer = new IntersectionObserver(
      ([entry]) => setNear(entry.isIntersecting),
      { rootMargin: '150% 0px' }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    if (!near) {
      // Fuera de la zona visible se libera la memoria del lienzo.
      canvas.width = 0
      canvas.height = 0
      return
    }

    let cancelled = false
    let task: { cancel: () => void; promise: Promise<unknown> } | null = null

    void (async () => {
      try {
        const page = await pdf.getPage(pageNumber)
        if (cancelled) return
        const ratio = window.devicePixelRatio || 1
        const scale = (cssWidth / size.width) * ratio
        const viewport = page.getViewport({ scale })
        canvas.width = Math.floor(viewport.width)
        canvas.height = Math.floor(viewport.height)
        const context = canvas.getContext('2d')
        if (!context) return
        task = page.render({ canvas, canvasContext: context, viewport })
        await task.promise
      } catch {
        // Render cancelado (zoom o scroll rápido): no es un error.
      }
    })()

    return () => {
      cancelled = true
      task?.cancel()
    }
  }, [near, pdf, pageNumber, cssWidth, size.width])

  return (
    <div
      ref={(node) => {
        wrapperRef.current = node
        registerRef(pageNumber, node)
      }}
      className="shrink-0 bg-white shadow-lg"
      style={{ width: cssWidth, height: cssHeight }}
      data-page={pageNumber}
    >
      <canvas
        ref={canvasRef}
        className="block size-full"
        style={{ width: cssWidth, height: cssHeight }}
        aria-label={`Página ${pageNumber}`}
      />
    </div>
  )
}

type PreviewPdfViewerProps = {
  dataBase64: string
  /** El motor de PDF no pudo abrir el archivo: se usa el visor nativo del navegador. */
  onFailed: () => void
}

export function PreviewPdfViewer({ dataBase64, onFailed }: PreviewPdfViewerProps) {
  const close = usePreviewClose()
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const pageNodes = useRef(new Map<number, HTMLDivElement>())
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null)
  const [sizes, setSizes] = useState<PageSize[]>([])
  const [containerWidth, setContainerWidth] = useState(0)
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageDraft, setPageDraft] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let task: PDFDocumentLoadingTask | null = null

    void (async () => {
      try {
        const pdfjs = await import('pdfjs-dist')
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url
        ).toString()

        task = pdfjs.getDocument({ data: base64ToBytes(dataBase64) })
        const document = await task.promise
        if (cancelled) return

        const measured: PageSize[] = []
        for (let number = 1; number <= document.numPages; number += 1) {
          const page = await document.getPage(number)
          const viewport = page.getViewport({ scale: 1 })
          measured.push({ width: viewport.width, height: viewport.height })
        }
        if (cancelled) return

        setSizes(measured)
        setPdf(document)
      } catch {
        if (!cancelled) onFailed()
      }
    })()

    return () => {
      cancelled = true
      void task?.destroy()
    }
    // onFailed es estable por construcción del padre (setter de estado).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataBase64])

  useEffect(() => {
    const node = scrollRef.current
    if (!node) return
    const observer = new ResizeObserver(() => setContainerWidth(node.clientWidth))
    observer.observe(node)
    setContainerWidth(node.clientWidth)
    return () => observer.disconnect()
  }, [pdf])

  const registerRef = useCallback((pageNumber: number, node: HTMLDivElement | null) => {
    if (node) pageNodes.current.set(pageNumber, node)
    else pageNodes.current.delete(pageNumber)
  }, [])

  const handleScroll = useCallback(() => {
    const scroller = scrollRef.current
    if (!scroller) return
    const reference = scroller.scrollTop + scroller.clientHeight * 0.4
    let active = 1
    for (const [number, node] of pageNodes.current) {
      if (node.offsetTop <= reference && number > active) active = number
    }
    setCurrentPage(active)
  }, [])

  function goToPage(number: number) {
    const total = sizes.length
    const target = Math.min(Math.max(1, Math.round(number)), total)
    const node = pageNodes.current.get(target)
    const scroller = scrollRef.current
    if (node && scroller) scroller.scrollTo({ top: node.offsetTop - 16 })
    setCurrentPage(target)
    setPageDraft(null)
  }

  if (!pdf || sizes.length === 0) {
    return (
      <p className="flex flex-1 items-center justify-center gap-2 text-sm text-white/80">
        <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
        {portalDocuments.previewLoading}
      </p>
    )
  }

  const zoom = ZOOM_STEPS[zoomIndex]
  const fitWidth = Math.max(
    240,
    Math.min(containerWidth - SIDE_GUTTER, MAX_PAGE_WIDTH)
  )
  const cssWidth = Math.round(fitWidth * zoom)

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        onClick={(event) => {
          if (event.target === event.currentTarget) close()
        }}
        // Barra discreta: fina y translúcida, sin el control por defecto del sistema.
        className="min-h-0 flex-1 overflow-auto [scrollbar-color:rgba(255,255,255,0.35)_transparent] [scrollbar-width:thin]"
      >
        <div
          className="flex w-max min-w-full flex-col items-center gap-3 px-4 pt-2 pb-24"
          onClick={(event) => {
            if (event.target === event.currentTarget) close()
          }}
        >
          {sizes.map((size, index) => (
            <PdfPage
              key={index}
              pdf={pdf}
              pageNumber={index + 1}
              size={size}
              cssWidth={cssWidth}
              registerRef={registerRef}
            />
          ))}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-5 flex justify-center">
        <div
          className="pointer-events-auto flex items-center gap-3 rounded-full bg-neutral-800/95 px-4 py-2 text-sm text-white shadow-lg"
          role="group"
          aria-label="Navegación del documento"
        >
          <label className="flex items-center gap-2">
            <span>Página</span>
            <input
              inputMode="numeric"
              value={pageDraft ?? String(currentPage)}
              onChange={(event) => setPageDraft(event.target.value.replace(/\D/g, ''))}
              onFocus={(event) => event.target.select()}
              onBlur={() => setPageDraft(null)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  const parsed = Number(pageDraft ?? currentPage)
                  if (Number.isFinite(parsed) && parsed > 0) goToPage(parsed)
                  event.currentTarget.blur()
                }
              }}
              className="w-10 rounded bg-neutral-700 px-1 py-0.5 text-center text-white outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              aria-label="Número de página"
            />
            <span>de {sizes.length}</span>
          </label>
          <span className="h-4 w-px bg-white/25" aria-hidden />
          <PreviewZoomControls zoomIndex={zoomIndex} onChange={setZoomIndex} />
        </div>
      </div>
    </div>
  )
}

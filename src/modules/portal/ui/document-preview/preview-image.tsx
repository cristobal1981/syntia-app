'use client'

import { useEffect, useRef, useState } from 'react'

import { base64ToBlobUrl, revokeBlobUrl } from '@/src/modules/portal/lib/base64-to-blob-url'
import { usePreviewClose } from '@/src/modules/portal/ui/document-preview/preview-dialog-layout'
import {
  DEFAULT_ZOOM_INDEX,
  PreviewZoomControls,
  ZOOM_STEPS,
} from '@/src/modules/portal/ui/document-preview/preview-zoom-controls'

type PreviewImageProps = {
  mimetype: string
  dataBase64: string
  alt: string
}

const MARGIN = 32

export function PreviewImage({ mimetype, dataBase64, alt }: PreviewImageProps) {
  const close = usePreviewClose()
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [src, setSrc] = useState<string | null>(null)
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null)
  const [box, setBox] = useState({ width: 0, height: 0 })
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX)

  useEffect(() => {
    const url = base64ToBlobUrl(mimetype, dataBase64)
    // El blob URL necesita liberarse en el cleanup — efecto externo real
    // (recurso del navegador), no una simple derivación de render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSrc(url)
    return () => revokeBlobUrl(url)
  }, [mimetype, dataBase64])

  useEffect(() => {
    const node = scrollRef.current
    if (!node) return
    const measure = () => setBox({ width: node.clientWidth, height: node.clientHeight })
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    measure()
    return () => observer.disconnect()
  }, [src])

  if (!src) return null

  // Al 100 % la imagen cabe entera (sin ampliar más allá de su tamaño real); el zoom parte de ahí.
  let displayWidth: number | undefined
  if (natural && box.width > 0 && box.height > 0) {
    const fit = Math.min(
      1,
      (box.width - MARGIN) / natural.width,
      (box.height - MARGIN) / natural.height
    )
    displayWidth = Math.max(1, Math.round(natural.width * fit * ZOOM_STEPS[zoomIndex]))
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollRef}
        onClick={(event) => {
          if (event.target === event.currentTarget) close()
        }}
        // Barra discreta: fina y translúcida, sin el control por defecto del sistema.
        className="min-h-0 flex-1 overflow-auto [scrollbar-color:rgba(255,255,255,0.35)_transparent] [scrollbar-width:thin]"
      >
        <div
          className="flex min-h-full w-max min-w-full items-center justify-center p-4 pb-20"
          onClick={(event) => {
            if (event.target === event.currentTarget) close()
          }}
        >
          {/* src es un blob: URL local (base64ToBlobUrl) — next/image no puede optimizarlo */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            onLoad={(event) =>
              setNatural({
                width: event.currentTarget.naturalWidth,
                height: event.currentTarget.naturalHeight,
              })
            }
            className="block max-w-none shrink-0 object-contain shadow-lg"
            style={displayWidth ? { width: displayWidth, height: 'auto' } : { maxWidth: '100%' }}
          />
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-5 flex justify-center">
        <div
          className="pointer-events-auto flex items-center gap-3 rounded-full bg-neutral-800/95 px-4 py-2 text-sm text-white shadow-lg"
          role="group"
          aria-label="Zoom de la imagen"
        >
          <PreviewZoomControls zoomIndex={zoomIndex} onChange={setZoomIndex} />
        </div>
      </div>
    </div>
  )
}

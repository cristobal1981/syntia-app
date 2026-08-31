'use client'

import { useEffect, useState } from 'react'

import { base64ToBlobUrl, revokeBlobUrl } from '@/src/modules/portal/lib/base64-to-blob-url'

type PreviewImageProps = {
  mimetype: string
  dataBase64: string
  alt: string
}

export function PreviewImage({ mimetype, dataBase64, alt }: PreviewImageProps) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    const url = base64ToBlobUrl(mimetype, dataBase64)
    // El blob URL necesita liberarse en el cleanup — efecto externo real
    // (recurso del navegador), no una simple derivación de render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSrc(url)
    return () => revokeBlobUrl(url)
  }, [mimetype, dataBase64])

  if (!src) return null

  return (
    <div className="flex h-full min-h-0 flex-1 items-center justify-center overflow-auto">
      {/* src es un blob: URL local (base64ToBlobUrl) — next/image no puede optimizarlo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="max-h-full w-auto max-w-full object-contain"
      />
    </div>
  )
}

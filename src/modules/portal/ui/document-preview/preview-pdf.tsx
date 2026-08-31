'use client'

import { useEffect, useState } from 'react'
import { ExternalLink, FileText } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { portalDocuments } from '@/content/portal-documents'
import { base64ToBlobUrl, revokeBlobUrl } from '@/src/modules/portal/lib/base64-to-blob-url'
import { useMobilePdfFallback } from '@/src/modules/portal/lib/use-mobile-pdf-fallback'

type PreviewPdfProps = {
  mimetype: string
  dataBase64: string
  title: string
}

function PreviewPdfMobileFallback({
  src,
  title,
}: {
  src: string
  title: string
}) {
  function handleOpen() {
    const opened = window.open(src, '_blank', 'noopener,noreferrer')
    if (!opened) {
      const anchor = document.createElement('a')
      anchor.href = src
      anchor.target = '_blank'
      anchor.rel = 'noopener noreferrer'
      anchor.click()
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-10 text-center">
      <FileText className="size-10 text-muted-foreground" aria-hidden />
      <div className="max-w-sm space-y-2">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">
          {portalDocuments.pdfMobileHint}
        </p>
      </div>
      <Button
        type="button"
        className="min-h-11 cursor-pointer"
        onClick={handleOpen}
      >
        <ExternalLink className="size-4" aria-hidden />
        <span className="ml-2">{portalDocuments.pdfMobileOpen}</span>
      </Button>
    </div>
  )
}

export function PreviewPdf({ mimetype, dataBase64, title }: PreviewPdfProps) {
  const [src, setSrc] = useState<string | null>(null)
  const useMobileFallback = useMobilePdfFallback()

  useEffect(() => {
    const url = base64ToBlobUrl(mimetype, dataBase64)
    // El blob URL necesita liberarse en el cleanup — efecto externo real
    // (recurso del navegador), no una simple derivación de render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSrc(url)
    return () => revokeBlobUrl(url)
  }, [mimetype, dataBase64])

  if (!src) return null

  if (useMobileFallback) {
    return <PreviewPdfMobileFallback src={src} title={title} />
  }

  return (
    <iframe
      src={src}
      title={title}
      className="h-full min-h-[50dvh] w-full flex-1 rounded-md border border-border bg-card dark:border-border/80"
    />
  )
}

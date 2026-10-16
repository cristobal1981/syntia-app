'use client'

import { useEffect, useState } from 'react'
import { FileText, Loader2 } from 'lucide-react'

import { PreviewImage } from '@/src/modules/portal/ui/document-preview/preview-image'
import { PreviewPdf } from '@/src/modules/portal/ui/document-preview/preview-pdf'
import { getInvoicePdf } from '@/src/modules/facturacion/infrastructure/local-pdf-store'

type AttachmentPreviewProps = {
  /** Archivo recién elegido (aún sin guardar). */
  file?: Blob | null
  /** Factura cuyo adjunto ya está guardado. */
  invoiceId?: string
  name: string
  mimetype: string | null
  emptyMessage: string
  /** Altura del visor. */
  className?: string
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

/** Vista previa de un PDF o una imagen, incrustada en la propia pantalla. */
export function AttachmentPreview({ file, invoiceId, name, mimetype, emptyMessage, className }: AttachmentPreviewProps) {
  const [loaded, setLoaded] = useState<{ key: string; dataBase64: string | null; mime: string } | null>(null)
  const key = file ? `file:${file.size}:${name}` : invoiceId ? `stored:${invoiceId}` : ''

  useEffect(() => {
    if (!key) return
    let cancelled = false
    void (async () => {
      const blob = file ?? (invoiceId ? await getInvoicePdf(invoiceId) : null)
      const dataBase64 = blob ? await blobToBase64(blob) : null
      if (!cancelled) setLoaded({ key, dataBase64, mime: blob?.type || mimetype || 'application/pdf' })
    })()
    return () => {
      cancelled = true
    }
  }, [key, file, invoiceId, mimetype])

  const current = loaded && loaded.key === key ? loaded : null
  const frame = `flex min-h-[24rem] flex-col overflow-hidden rounded-xl border border-border bg-muted/30 dark:border-border/60 ${className ?? 'h-[75dvh]'}`

  if (!key) {
    return (
      <div className={`${frame} items-center justify-center gap-3 px-6 text-center`}>
        <FileText className="size-8 text-muted-foreground" aria-hidden />
        <p className="max-w-xs text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    )
  }

  if (!current) {
    return (
      <div className={`${frame} items-center justify-center`}>
        <Loader2 className="size-5 animate-spin text-muted-foreground motion-reduce:animate-none" aria-hidden />
      </div>
    )
  }

  if (!current.dataBase64) {
    return (
      <div className={`${frame} items-center justify-center px-6 text-center`}>
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className={frame}>
      {current.mime.startsWith('image/') ? (
        <PreviewImage mimetype={current.mime} dataBase64={current.dataBase64} alt={name} />
      ) : (
        <PreviewPdf mimetype="application/pdf" dataBase64={current.dataBase64} title={name} />
      )}
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

import { facturacion } from '@/content/facturacion'
import { getInvoicePdf } from '@/src/modules/facturacion/infrastructure/local-pdf-store'
import { PreviewViewerShell } from '@/src/modules/portal/ui/document-preview/preview-dialog-layout'
import { PreviewImage } from '@/src/modules/portal/ui/document-preview/preview-image'
import { PreviewPdf } from '@/src/modules/portal/ui/document-preview/preview-pdf'

type Props = {
  invoiceId: string | null
  filename: string | null
  mimetype: string | null
  onClose: () => void
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

/** Abre el PDF guardado de una factura con el mismo visor que Documentos. */
export function InvoicePdfPreview({ invoiceId, filename, mimetype, onClose }: Props) {
  const [loaded, setLoaded] = useState<{ id: string; dataBase64: string | null } | null>(null)

  useEffect(() => {
    if (!invoiceId) return
    let cancelled = false
    void (async () => {
      const blob = await getInvoicePdf(invoiceId)
      const dataBase64 = blob ? await blobToBase64(blob) : null
      if (!cancelled) setLoaded({ id: invoiceId, dataBase64 })
    })()
    return () => {
      cancelled = true
    }
  }, [invoiceId])

  const name = filename ?? facturacion.preview.title
  const current = loaded && loaded.id === invoiceId ? loaded : null
  const dataBase64 = current?.dataBase64 ?? null
  const ready = dataBase64 !== null
  const isImage = Boolean(mimetype?.startsWith('image/'))

  return (
    <PreviewViewerShell
      open={invoiceId !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title={name}
      closeLabel={facturacion.preview.close}
      category={isImage ? 'image' : 'pdf'}
      file={ready ? { filename: name, mimetype: isImage ? (mimetype ?? 'image/jpeg') : 'application/pdf', dataBase64 } : null}
      ready={ready}
    >
      {ready ? (
        isImage ? (
          <PreviewImage mimetype={mimetype ?? 'image/jpeg'} dataBase64={dataBase64} alt={name} />
        ) : (
          <PreviewPdf mimetype="application/pdf" dataBase64={dataBase64} title={name} />
        )
      ) : (
        <p className="flex flex-1 items-center justify-center gap-2 text-sm text-white/80">
          {current ? (
            facturacion.invoices.noPdf
          ) : (
            <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
          )}
        </p>
      )}
    </PreviewViewerShell>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import DOMPurify from 'dompurify'
import mammoth from 'mammoth'

import { portalDocuments } from '@/content/portal-documents'
import { PreviewFallback } from '@/src/modules/portal/ui/document-preview/preview-fallback'

type PreviewDocxProps = {
  dataBase64: string
  fallbackMessage: string
}

export function PreviewDocx({ dataBase64, fallbackMessage }: PreviewDocxProps) {
  const [html, setHtml] = useState<string | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    setHtml(null)
    setError(false)

    async function renderDocx() {
      try {
        const binary = atob(dataBase64)
        const bytes = new Uint8Array(binary.length)
        for (let index = 0; index < binary.length; index += 1) {
          bytes[index] = binary.charCodeAt(index)
        }
        const result = await mammoth.convertToHtml({ arrayBuffer: bytes.buffer })
        if (cancelled) return
        setHtml(DOMPurify.sanitize(result.value))
      } catch {
        if (!cancelled) setError(true)
      }
    }

    void renderDocx()

    return () => {
      cancelled = true
    }
  }, [dataBase64])

  if (error) {
    return <PreviewFallback message={fallbackMessage} />
  }

  if (!html) {
    return (
      <p className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2
          className="size-4 animate-spin motion-reduce:animate-none"
          aria-hidden
        />
        {portalDocuments.previewLoading}
      </p>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-card dark:border-border/80">
      <div
        className="prose prose-sm dark:prose-invert min-h-0 flex-1 overflow-y-auto p-4 text-foreground [&_table]:w-full [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:px-2 [&_th]:py-1"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}

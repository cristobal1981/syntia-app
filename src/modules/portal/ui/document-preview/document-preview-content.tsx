'use client'

import type { DocumentPreviewCategory } from '@/src/modules/portal/domain/classify-document-preview'
import { PreviewDocx } from '@/src/modules/portal/ui/document-preview/preview-docx'
import { PreviewFallback } from '@/src/modules/portal/ui/document-preview/preview-fallback'
import { PreviewImage } from '@/src/modules/portal/ui/document-preview/preview-image'
import { PreviewPdf } from '@/src/modules/portal/ui/document-preview/preview-pdf'
import { PreviewXlsx } from '@/src/modules/portal/ui/document-preview/preview-xlsx'

type DocumentPreviewContentProps = {
  category: DocumentPreviewCategory
  filename: string
  mimetype: string
  dataBase64: string
  fallbackMessage: string
}

export function DocumentPreviewContent({
  category,
  filename,
  mimetype,
  dataBase64,
  fallbackMessage,
}: DocumentPreviewContentProps) {
  if (category === 'image') {
    return <PreviewImage mimetype={mimetype} dataBase64={dataBase64} alt={filename} />
  }

  if (category === 'pdf') {
    return (
      <PreviewPdf mimetype={mimetype} dataBase64={dataBase64} title={filename} />
    )
  }

  if (category === 'docx') {
    return <PreviewDocx dataBase64={dataBase64} fallbackMessage={fallbackMessage} />
  }

  if (category === 'xlsx') {
    return <PreviewXlsx dataBase64={dataBase64} fallbackMessage={fallbackMessage} />
  }

  return <PreviewFallback message={fallbackMessage} />
}

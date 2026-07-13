import { FileText } from 'lucide-react'

type PortalDocumentsCellProps = {
  count: number
}

export function PortalDocumentsCell({ count }: PortalDocumentsCellProps) {
  if (!count) {
    return <span className="text-muted-foreground">—</span>
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-foreground">
      <FileText className="size-3.5 text-muted-foreground" aria-hidden />
      <span className="tabular-nums">{count}</span>
    </span>
  )
}

'use client'

import { FileWarning } from 'lucide-react'

type PreviewFallbackProps = {
  message: string
}

export function PreviewFallback({ message }: PreviewFallbackProps) {
  return (
    <div className="flex flex-col items-center gap-4 px-4 py-10 text-center">
      <FileWarning
        className="size-10 text-muted-foreground"
        aria-hidden
      />
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

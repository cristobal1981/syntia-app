'use client'

import { X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { solicitudes } from '@/content/solicitudes'

type OnboardingEmailPreviewDialogProps = {
  subject: string | null
  html: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function OnboardingEmailPreviewDialog({
  subject,
  html,
  open,
  onOpenChange,
}: OnboardingEmailPreviewDialogProps) {
  const copy = solicitudes.detail.emailPreview
  const title = subject ?? copy.title

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="fixed inset-0 top-0 left-0 z-50 flex h-dvh w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 bg-background p-0 shadow-none sm:max-w-none"
        aria-label={copy.close}
      >
        <div className="shrink-0 border-b border-border bg-card px-3 py-3 sm:px-4 dark:border-border/50">
          <div className="flex items-center gap-2">
            <DialogTitle className="min-w-0 flex-1 truncate text-left text-sm font-semibold sm:text-base">
              {title}
            </DialogTitle>
            <DialogClose asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 shrink-0 cursor-pointer"
                aria-label={copy.close}
              >
                <X className="size-4" aria-hidden />
              </Button>
            </DialogClose>
          </div>
        </div>

        <div className="min-h-0 flex-1 bg-muted/30">
          {html ? (
            <iframe
              title={title}
              srcDoc={html}
              sandbox=""
              tabIndex={-1}
              // Mock puramente visual: sin sandbox no basta, un <a> normal
              // aún puede autonavegar el propio iframe al hacer click (el
              // sandbox solo bloquea top-navigation/scripts/forms/popups).
              // pointer-events-none deja el contenido inerte del todo.
              className="pointer-events-none size-full border-0 bg-white select-none"
            />
          ) : (
            <p className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
              {copy.empty}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'

type TramiteDrawerFooterProps = {
  formId: string
  pending: boolean
  cancelLabel: string
  creatingLabel: string
  submitLabel: string
  onCancel: () => void
}

/** Pie compartido por los pasos "general" y "trámite/solicitud" del drawer — misma estructura, distinto copy/formId. */
export function TramiteDrawerFooter({
  formId,
  pending,
  cancelLabel,
  creatingLabel,
  submitLabel,
  onCancel,
}: TramiteDrawerFooterProps) {
  return (
    <div className="shrink-0 border-t border-border bg-card px-6 pt-4 pb-6">
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" disabled={pending} onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button type="submit" form={formId} disabled={pending} aria-busy={pending}>
          {pending ? (
            <>
              <Loader2
                className="size-4 animate-spin motion-reduce:animate-none"
                aria-hidden
              />
              {creatingLabel}
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </div>
  )
}

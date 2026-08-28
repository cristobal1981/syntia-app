'use client'

import { useId, useState } from 'react'
import { Paperclip, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { altaTrabajadorWizard } from '@/content/alta-trabajador-wizard'
import { tramiteSolicitudes } from '@/content/tramite-solicitudes'
import {
  readFilesAsUploadPayload,
  validateChatterUploadFiles,
} from '@/src/modules/portal/lib/chatter-attachment-validation'
import type { PortalChatterUploadFile } from '@/src/modules/portal/domain/portal-chatter-types'
import {
  TramiteFieldError,
  TramiteRequiredMark,
} from '@/src/modules/tramites/ui/tramite-drawer-field'

type AltaTrabajadorAttachmentFieldProps = {
  label: string
  hint?: string
  value: PortalChatterUploadFile | null
  error?: string
  required?: boolean
  onChange: (file: PortalChatterUploadFile | null) => void
}

export function AltaTrabajadorAttachmentField({
  label,
  hint,
  value,
  error,
  required,
  onChange,
}: AltaTrabajadorAttachmentFieldProps) {
  const inputId = useId()
  const [localError, setLocalError] = useState<string | null>(null)
  const copy = altaTrabajadorWizard.attachment
  const displayError = error ?? localError ?? undefined
  const errorId = displayError ? `${inputId}-error` : undefined

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setLocalError(null)
    const [payload] = await readFilesAsUploadPayload([file])
    if (!payload) return

    const validation = validateChatterUploadFiles([payload])
    if (!validation.ok) {
      setLocalError(tramiteSolicitudes.errors.attachmentRequired)
      return
    }

    onChange(payload)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-foreground">
        {label}
        {required ? <TramiteRequiredMark /> : null}
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" className="cursor-pointer" asChild>
          <label htmlFor={inputId} className="cursor-pointer">
            <Paperclip className="size-4" aria-hidden />
            {copy.selectButton}
          </label>
        </Button>
        <input
          id={inputId}
          type="file"
          className="hidden"
          aria-describedby={errorId}
          onChange={handleFileChange}
        />
        {value ? (
          <span className="flex items-center gap-2 text-sm text-foreground">
            {value.name}
            <button
              type="button"
              onClick={() => onChange(null)}
              className="cursor-pointer text-muted-foreground hover:text-foreground"
              aria-label={copy.removeButton}
            >
              <X className="size-4" aria-hidden />
            </button>
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">{copy.noFileSelected}</span>
        )}
      </div>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      <TramiteFieldError message={displayError} id={errorId} />
    </div>
  )
}

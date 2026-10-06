import type { RefObject } from 'react'

import { Input } from '@/components/ui/input'
import {
  ChatterComposer,
  type ChatterComposerHandle,
} from '@/src/modules/portal/ui/chatter-composer'
import { GENERAL_FORM_ID, generalCopy } from '@/src/modules/tramites/ui/tramite-create-consulta-helpers'

type TramiteGeneralConsultaFormProps = {
  subjectId: string
  subject: string
  onSubjectChange: (value: string) => void
  composerRef: RefObject<ChatterComposerHandle | null>
  composerResetToken: number
  onComposerEmptyChange: (empty: boolean) => void
  pending: boolean
  fieldErrors: Record<string, string>
  formError: string | null
  onSubmit: () => void
}

export function TramiteGeneralConsultaForm({
  subjectId,
  subject,
  onSubjectChange,
  composerRef,
  composerResetToken,
  onComposerEmptyChange,
  pending,
  fieldErrors,
  formError,
  onSubmit,
}: TramiteGeneralConsultaFormProps) {
  return (
    <form
      id={GENERAL_FORM_ID}
      className="flex flex-col gap-5 px-6 py-5"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <div className="space-y-2">
        <label htmlFor={subjectId} className="text-sm font-medium text-foreground">
          {generalCopy.drawer.subjectLabel}
        </label>
        <Input
          id={subjectId}
          name="subject"
          value={subject}
          maxLength={120}
          autoComplete="off"
          spellCheck
          placeholder={generalCopy.drawer.subjectPlaceholder}
          disabled={pending}
          aria-invalid={Boolean(fieldErrors.subject)}
          aria-describedby={fieldErrors.subject ? `${subjectId}-error` : undefined}
          onChange={(event) => onSubjectChange(event.target.value)}
        />
        {fieldErrors.subject ? (
          <p id={`${subjectId}-error`} className="text-sm text-destructive" role="alert">
            {fieldErrors.subject}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <span className="text-sm font-medium text-foreground">
          {generalCopy.drawer.bodyLabel}
        </span>
        <ChatterComposer
          ref={composerRef}
          variant="full"
          disabled={pending}
          resetToken={composerResetToken}
          editorMaxHeightClass="max-h-[200px]"
          onEmptyChange={onComposerEmptyChange}
          onSubmit={() => {
            const form = document.getElementById(GENERAL_FORM_ID) as HTMLFormElement | null
            form?.requestSubmit()
          }}
        />
        {fieldErrors.body ? (
          <p className="text-sm text-destructive" role="alert">
            {fieldErrors.body}
          </p>
        ) : null}
      </div>

      {formError ? (
        <p className="text-sm text-destructive" role="alert" aria-live="polite">
          {formError}
        </p>
      ) : null}
    </form>
  )
}

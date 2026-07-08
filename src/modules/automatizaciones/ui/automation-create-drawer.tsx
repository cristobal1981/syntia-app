'use client'

import { useEffect, useState, useTransition, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { automatizaciones } from '@/content/automatizaciones'
import { cn } from '@/lib/utils'
import type {
  AdvisorVisibility,
  PortalAutomationListItem,
} from '@/src/modules/automatizaciones/domain/types'
import {
  createAutomationAction,
  updateAutomationAction,
} from '@/src/modules/automatizaciones/application/automatizaciones-actions'
import { AUTOMATION_ICON_IDS } from '@/src/modules/automatizaciones/domain/automation-icons'
import {
  AutomationInputFieldsEditor,
  draftFieldsToInputFields,
  inputFieldsToDrafts,
  type DraftInputField,
} from '@/src/modules/automatizaciones/ui/automation-input-fields-editor'
import { PortalSideDrawer } from '@/src/modules/portal/ui/portal-side-drawer'

const FORM_ID = 'automation-create-drawer-form'

/** Campos "hundidos" sobre el panel bg-card del drawer: contraste en dark mode. */
const RECESSED_FIELD_CLASS =
  'border-input bg-background dark:border-input dark:bg-background'

type FormState = {
  slug: string
  title: string
  description: string
  webhookPath: string
  icon: string
  isActive: boolean
  visibility: AdvisorVisibility
  inputFields: DraftInputField[]
}

const EMPTY_FORM: FormState = {
  slug: '',
  title: '',
  description: '',
  webhookPath: '/webhook/',
  icon: 'workflow',
  isActive: true,
  visibility: 'none',
  inputFields: [],
}

function formFromAutomation(automation: PortalAutomationListItem): FormState {
  return {
    slug: automation.slug,
    title: automation.title,
    description: automation.description ?? '',
    webhookPath: automation.webhookPath,
    icon: automation.icon,
    isActive: automation.isActive,
    visibility: automation.visibility,
    inputFields: inputFieldsToDrafts(automation.inputFields),
  }
}

type AutomationCreateDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
  /** Si viene, el drawer edita esa automatización en vez de crear. */
  automation?: PortalAutomationListItem | null
}

function DrawerField({
  id,
  label,
  hint,
  children,
  className,
}: {
  id: string
  label: string
  hint?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      {hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export function AutomationCreateDrawer({
  open,
  onOpenChange,
  onCreated,
  automation = null,
}: AutomationCreateDrawerProps) {
  const copy = automatizaciones.create
  const isEdit = Boolean(automation)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (!open) {
      setForm(EMPTY_FORM)
      setFieldError(null)
      return
    }
    setForm(automation ? formFromAutomation(automation) : EMPTY_FORM)
    setFieldError(null)
  }, [open, automation])

  function patchForm(patch: Partial<FormState>) {
    setForm((current) => ({ ...current, ...patch }))
    setFieldError(null)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFieldError(null)

    startTransition(async () => {
      const payload = {
        slug: form.slug,
        title: form.title,
        description: form.description,
        webhookPath: form.webhookPath,
        icon: form.icon,
        isActive: form.isActive,
        visibility: form.visibility,
        inputFields: draftFieldsToInputFields(form.inputFields),
      }

      const result = automation
        ? await updateAutomationAction(automation.id, payload)
        : await createAutomationAction(payload)

      const failedCopy = automation
        ? automatizaciones.toast.updateFailed
        : automatizaciones.toast.createFailed

      if (!result.ok) {
        setFieldError(result.message ?? failedCopy)
        toast.error(result.message ?? failedCopy)
        return
      }

      toast.success(
        automation ? automatizaciones.toast.updated : automatizaciones.toast.created
      )
      onCreated()
      onOpenChange(false)
    })
  }

  return (
    <PortalSideDrawer open={open} onOpenChange={onOpenChange} size="wide">
      <div className="flex h-full min-h-0 flex-col">
        <DialogHeader className="shrink-0 border-b border-border px-6 py-4 pr-12 text-left">
          <DialogTitle className="font-sans text-lg font-semibold">
            {isEdit ? copy.titleEdit : copy.title}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {isEdit ? copy.descriptionEdit : copy.description}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pt-6">
          <form
            id={FORM_ID}
            onSubmit={handleSubmit}
            className="flex flex-col gap-5 pb-6"
            noValidate
          >
            <DrawerField id="automation-slug" label={copy.fields.slug} hint={copy.hints.slug}>
              <Input
                id="automation-slug"
                name="slug"
                value={form.slug}
                onChange={(event) => patchForm({ slug: event.target.value })}
                placeholder="sync-odoo-partners"
                autoComplete="off"
                aria-describedby="automation-slug-hint"
                className={RECESSED_FIELD_CLASS}
              />
            </DrawerField>

            <DrawerField id="automation-title" label={copy.fields.title}>
              <Input
                id="automation-title"
                name="title"
                value={form.title}
                onChange={(event) => patchForm({ title: event.target.value })}
                placeholder={copy.placeholders.title}
                autoComplete="off"
                className={RECESSED_FIELD_CLASS}
              />
            </DrawerField>

            <DrawerField
              id="automation-description"
              label={copy.fields.description}
            >
              <Textarea
                id="automation-description"
                name="description"
                value={form.description}
                onChange={(event) =>
                  patchForm({ description: event.target.value })
                }
                placeholder={copy.placeholders.description}
                rows={3}
                className={RECESSED_FIELD_CLASS}
              />
            </DrawerField>

            <DrawerField
              id="automation-webhook"
              label={copy.fields.webhookPath}
              hint={copy.hints.webhookPath}
            >
              <Input
                id="automation-webhook"
                name="webhookPath"
                value={form.webhookPath}
                onChange={(event) =>
                  patchForm({ webhookPath: event.target.value })
                }
                placeholder="/webhook/mi-flujo"
                autoComplete="off"
                aria-describedby="automation-webhook-hint"
                className={RECESSED_FIELD_CLASS}
              />
            </DrawerField>

            <DrawerField
              id="automation-input-fields"
              label={copy.fields.inputFields}
              hint={copy.hints.inputFields}
            >
              <AutomationInputFieldsEditor
                fields={form.inputFields}
                onChange={(inputFields) => patchForm({ inputFields })}
              />
            </DrawerField>

            <DrawerField id="automation-icon" label={copy.fields.icon}>
              <Select
                value={form.icon}
                onValueChange={(next) => patchForm({ icon: next })}
              >
                <SelectTrigger
                  id="automation-icon"
                  aria-label={copy.fields.icon}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AUTOMATION_ICON_IDS.map((iconId) => (
                    <SelectItem key={iconId} value={iconId}>
                      {copy.icons[iconId]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </DrawerField>

            <DrawerField
              id="automation-visibility"
              label={copy.fields.advisorVisibility}
            >
              <Select
                value={form.visibility}
                onValueChange={(next) =>
                  patchForm({
                    visibility: next as AdvisorVisibility,
                  })
                }
              >
                <SelectTrigger
                  id="automation-visibility"
                  aria-label={copy.fields.advisorVisibility}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    Object.entries(automatizaciones.access.visibility) as Array<
                      [AdvisorVisibility, string]
                    >
                  ).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </DrawerField>

            <div className="flex flex-col gap-3 rounded-lg border border-input bg-background px-4 py-3">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) =>
                    patchForm({ isActive: event.target.checked })
                  }
                  className="size-4 cursor-pointer"
                />
                <span className="text-sm text-foreground">{copy.fields.isActive}</span>
              </label>
            </div>

            {fieldError ? (
              <p className="text-sm text-destructive" role="alert">
                {fieldError}
              </p>
            ) : null}
          </form>
        </div>

        <div className="shrink-0 border-t border-border bg-card px-6 pt-4 pb-6">
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => onOpenChange(false)}
            >
              {copy.actions.cancel}
            </Button>
            <Button
              type="submit"
              form={FORM_ID}
              disabled={pending}
              aria-busy={pending}
            >
              {pending ? (
                <>
                  <Loader2
                    className="size-4 animate-spin motion-reduce:animate-none"
                    aria-hidden
                  />
                  {isEdit ? copy.actions.submittingEdit : copy.actions.submitting}
                </>
              ) : isEdit ? (
                copy.actions.submitEdit
              ) : (
                copy.actions.submit
              )}
            </Button>
          </div>
        </div>
      </div>
    </PortalSideDrawer>
  )
}

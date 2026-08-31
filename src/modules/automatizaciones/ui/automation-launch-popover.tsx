'use client'

import { useEffect, useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from '@/components/ui/popover'
import { automatizaciones } from '@/content/automatizaciones'
import { listOdooCompaniesForAutomationAction } from '@/src/modules/automatizaciones/application/automatizaciones-actions'
import type { OdooCompanyOption } from '@/src/modules/automatizaciones/domain/odoo-company-option'
import type { AutomationInputField } from '@/src/modules/automatizaciones/domain/types'
import { MAX_AUTOMATION_INPUT_TEXT_LENGTH } from '@/src/modules/automatizaciones/domain/types'
import { OdooCompaniesMultiPicker } from '@/src/modules/automatizaciones/ui/odoo-companies-multi-picker'

const SELECT_CLASS =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm'

const INPUT_CLASS =
  'border-input bg-background dark:border-input dark:bg-background'

function buildInitialValues(fields: AutomationInputField[]): Record<string, string> {
  const values: Record<string, string> = {}
  for (const field of fields) {
    if (field.type === 'checkbox') {
      values[field.key] = field.defaultValue === 'true' ? 'true' : 'false'
      continue
    }
    values[field.key] = field.defaultValue ?? ''
  }
  return values
}

function buildInitialCompanyIds(
  fields: AutomationInputField[]
): Record<string, number[]> {
  const values: Record<string, number[]> = {}
  for (const field of fields) {
    if (field.type === 'odoo_companies_multi') {
      values[field.key] = []
    }
  }
  return values
}

type AutomationLaunchPopoverProps = {
  automationTitle: string
  fields: AutomationInputField[]
  open: boolean
  onOpenChange: (open: boolean) => void
  pending: boolean
  onLaunch: (
    values: Record<string, string>,
    companyIdsByField?: Record<string, number[]>
  ) => void
  children: React.ReactNode
}

/** Pide los parámetros de entrada de la automatización antes de lanzarla. */
export function AutomationLaunchPopover({
  automationTitle,
  fields,
  open,
  onOpenChange,
  pending,
  onLaunch,
  children,
}: AutomationLaunchPopoverProps) {
  const copy = automatizaciones.card
  const pickerCopy = automatizaciones.odooCompaniesPicker
  const hasCompanyFields = fields.some(
    (field) => field.type === 'odoo_companies_multi'
  )
  const [values, setValues] = useState<Record<string, string>>(() =>
    buildInitialValues(fields)
  )
  const [companyIdsByField, setCompanyIdsByField] = useState<
    Record<string, number[]>
  >(() => buildInitialCompanyIds(fields))
  const [companies, setCompanies] = useState<OdooCompanyOption[]>([])
  const [companiesLoadState, setCompaniesLoadState] = useState<
    'idle' | 'loading' | 'ready' | 'error'
  >('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !hasCompanyFields) {
      if (!open) {
        // Reset al cerrar + fetch al abrir (patrón fetch-on-open estándar de
        // este repo, sin librería de fetching): no es estado derivable en
        // render, depende de cuándo se abre/cierra el popover.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCompaniesLoadState('idle')
        setCompanies([])
      }
      return
    }

    let cancelled = false
    setCompaniesLoadState('loading')

    void listOdooCompaniesForAutomationAction().then((result) => {
      if (cancelled) return

      if (!result.ok) {
        setCompaniesLoadState('error')
        return
      }

      setCompanies(result.data.companies)
      setCompaniesLoadState('ready')
    })

    return () => {
      cancelled = true
    }
  }, [open, hasCompanyFields])

  function handleOpenChange(next: boolean) {
    if (next) {
      setValues(buildInitialValues(fields))
      setCompanyIdsByField(buildInitialCompanyIds(fields))
      setError(null)
    }
    onOpenChange(next)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    for (const field of fields) {
      if (field.type === 'odoo_companies_multi') {
        const ids = companyIdsByField[field.key] ?? []
        if (field.required && !ids.length) {
          setError(`${copy.launchParamsRequired}: ${field.label}`)
          return
        }
        continue
      }

      if (field.type === 'checkbox') {
        const checked = (values[field.key] ?? 'false') === 'true'
        if (field.required && !checked) {
          setError(copy.launchParamsCheckboxRequired.replace('{label}', field.label))
          return
        }
        continue
      }

      const value = (values[field.key] ?? '').trim()
      if (field.required && !value) {
        setError(`${copy.launchParamsRequired}: ${field.label}`)
        return
      }
      if (
        field.type === 'text' &&
        value.length > MAX_AUTOMATION_INPUT_TEXT_LENGTH
      ) {
        setError(`${field.label}: ${copy.launchParamsTooLong}`)
        return
      }
    }

    setError(null)
    onLaunch(values, companyIdsByField)
  }

  function renderField(field: AutomationInputField) {
    if (field.type === 'odoo_companies_multi') {
      if (companiesLoadState === 'loading') {
        return (
          <p className="text-xs text-muted-foreground">{pickerCopy.loading}</p>
        )
      }
      if (companiesLoadState === 'error') {
        return (
          <p className="text-xs text-destructive" role="alert">
            {pickerCopy.loadError}
          </p>
        )
      }
      return (
        <OdooCompaniesMultiPicker
          companies={companies}
          selectedIds={companyIdsByField[field.key] ?? []}
          onChange={(ids) => {
            setError(null)
            setCompanyIdsByField((current) => ({
              ...current,
              [field.key]: ids,
            }))
          }}
          label={field.label}
          required={field.required}
        />
      )
    }

    if (field.type === 'checkbox') {
      const checked = (values[field.key] ?? 'false') === 'true'
      return (
        <label className="flex cursor-pointer items-start gap-2 rounded-md border border-border bg-muted/20 px-3 py-2.5">
          <input
            id={`launch-${field.key}`}
            type="checkbox"
            checked={checked}
            onChange={(event) => {
              setError(null)
              setValues((current) => ({
                ...current,
                [field.key]: event.target.checked ? 'true' : 'false',
              }))
            }}
            className="mt-0.5 size-4 shrink-0 cursor-pointer"
          />
          <span className="text-sm text-foreground">
            {field.label}
            {field.required ? (
              <span aria-hidden className="text-destructive">
                {' '}
                *
              </span>
            ) : null}
          </span>
        </label>
      )
    }

    return (
      <>
        <label
          htmlFor={`launch-${field.key}`}
          className="text-xs font-medium text-foreground"
        >
          {field.label}
          {field.required ? (
            <span aria-hidden className="text-destructive">
              {' '}
              *
            </span>
          ) : null}
        </label>
        {field.type === 'text' ? (
          <Input
            id={`launch-${field.key}`}
            value={values[field.key] ?? ''}
            onChange={(event) => {
              setError(null)
              setValues((current) => ({
                ...current,
                [field.key]: event.target.value,
              }))
            }}
            maxLength={MAX_AUTOMATION_INPUT_TEXT_LENGTH}
            className={INPUT_CLASS}
          />
        ) : (
          <Select
            value={values[field.key] ?? ''}
            onValueChange={(next) => {
              setError(null)
              setValues((current) => ({
                ...current,
                [field.key]: next,
              }))
            }}
          >
            <SelectTrigger
              id={`launch-${field.key}`}
              className={SELECT_CLASS}
              aria-label={field.label}
            >
              <SelectValue
                placeholder={
                  field.required ? copy.launchParamsRequired : undefined
                }
              />
            </SelectTrigger>
            <SelectContent>
              {!field.required ? (
                <SelectItem value="">{copy.launchParamsRequired}</SelectItem>
              ) : null}
              {field.options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </>
    )
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverAnchor asChild>
        <span className="inline-flex shrink-0">{children}</span>
      </PopoverAnchor>
      <PopoverContent
        className="flex w-80 max-w-[calc(100vw-2rem)] max-h-[min(85dvh,28rem)] flex-col overflow-hidden p-0"
        align="end"
        side="top"
        collisionPadding={16}
      >
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-foreground">
              {copy.launchParamsTitle} · {automationTitle}
            </p>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-4 py-3">
            {fields.map((field) => (
              <div key={field.key} className="flex flex-col gap-1.5">
                {renderField(field)}
              </div>
            ))}

            {error ? (
              <p className="text-xs text-destructive" role="alert">
                {error}
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 justify-end gap-2 border-t border-border px-4 py-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              {copy.launchParamsCancel}
            </Button>
            <Button type="submit" size="sm" disabled={pending} aria-busy={pending}>
              {pending ? copy.launching : copy.launchParamsSubmit}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  )
}

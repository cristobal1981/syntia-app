'use client'

import { useState, type FormEvent } from 'react'

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
import type { AutomationInputField } from '@/src/modules/automatizaciones/domain/types'
import { MAX_AUTOMATION_INPUT_TEXT_LENGTH } from '@/src/modules/automatizaciones/domain/types'

const SELECT_CLASS =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm'

const INPUT_CLASS =
  'border-input bg-background dark:border-input dark:bg-background'

function buildInitialValues(fields: AutomationInputField[]): Record<string, string> {
  const values: Record<string, string> = {}
  for (const field of fields) {
    values[field.key] = field.defaultValue ?? ''
  }
  return values
}

type AutomationLaunchPopoverProps = {
  automationTitle: string
  fields: AutomationInputField[]
  open: boolean
  onOpenChange: (open: boolean) => void
  pending: boolean
  onLaunch: (values: Record<string, string>) => void
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
  const [values, setValues] = useState<Record<string, string>>(() =>
    buildInitialValues(fields)
  )
  const [error, setError] = useState<string | null>(null)

  function handleOpenChange(next: boolean) {
    if (next) {
      setValues(buildInitialValues(fields))
      setError(null)
    }
    onOpenChange(next)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    for (const field of fields) {
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
    onLaunch(values)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverAnchor asChild>
        <span className="inline-flex shrink-0">{children}</span>
      </PopoverAnchor>
      <PopoverContent className="z-[60] w-72 p-4" align="end" side="top">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-foreground">
            {copy.launchParamsTitle} · {automationTitle}
          </p>

          {fields.map((field) => (
            <div key={field.key} className="flex flex-col gap-1.5">
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
            </div>
          ))}

          {error ? (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
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

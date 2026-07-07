'use client'

import { Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { automatizaciones } from '@/content/automatizaciones'
import type {
  AutomationInputField,
  AutomationInputFieldType,
} from '@/src/modules/automatizaciones/domain/types'

export type DraftInputOption = {
  localId: string
  value: string
  label: string
}

export type DraftInputField = {
  localId: string
  type: AutomationInputFieldType
  key: string
  label: string
  required: boolean
  defaultValue: string
  options: DraftInputOption[]
}

const RECESSED_FIELD_CLASS =
  'border-input bg-background dark:border-input dark:bg-background'

const SELECT_CLASS =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm'

let localIdCounter = 0
function nextLocalId(): string {
  localIdCounter += 1
  return `draft-${Date.now().toString(36)}-${localIdCounter}`
}

export function emptyDraftInputField(
  type: AutomationInputFieldType = 'select'
): DraftInputField {
  return {
    localId: nextLocalId(),
    type,
    key: '',
    label: '',
    required: true,
    defaultValue: '',
    options: type === 'select' ? [emptyDraftInputOption()] : [],
  }
}

function emptyDraftInputOption(): DraftInputOption {
  return { localId: nextLocalId(), value: '', label: '' }
}

export function inputFieldsToDrafts(
  fields: AutomationInputField[]
): DraftInputField[] {
  return fields.map((field) => ({
    localId: nextLocalId(),
    type: field.type,
    key: field.key,
    label: field.label,
    required: field.required,
    defaultValue: field.defaultValue ?? '',
    options:
      field.type === 'select'
        ? field.options.map((option) => ({
            localId: nextLocalId(),
            value: option.value,
            label: option.label,
          }))
        : [],
  }))
}

export function draftFieldsToInputFields(
  drafts: DraftInputField[]
): AutomationInputField[] {
  return drafts.map((draft) => ({
    key: draft.key.trim().toLowerCase(),
    label: draft.label.trim(),
    type: draft.type,
    required: draft.required,
    defaultValue: draft.defaultValue.trim() || null,
    options:
      draft.type === 'select'
        ? draft.options.map((option) => ({
            value: option.value.trim(),
            label: option.label.trim() || option.value.trim(),
          }))
        : [],
  }))
}

type AutomationInputFieldsEditorProps = {
  fields: DraftInputField[]
  onChange: (next: DraftInputField[]) => void
}

export function AutomationInputFieldsEditor({
  fields,
  onChange,
}: AutomationInputFieldsEditorProps) {
  const copy = automatizaciones.create.inputFieldsEditor
  const hints = automatizaciones.create.hints

  function patchField(localId: string, patch: Partial<DraftInputField>) {
    onChange(
      fields.map((field) => {
        if (field.localId !== localId) return field
        const next = { ...field, ...patch }
        if (patch.type === 'text') {
          return { ...next, options: [], defaultValue: next.defaultValue }
        }
        if (patch.type === 'select' && !next.options.length) {
          return { ...next, options: [emptyDraftInputOption()] }
        }
        return next
      })
    )
  }

  function patchOption(
    fieldId: string,
    optionId: string,
    patch: Partial<DraftInputOption>
  ) {
    onChange(
      fields.map((field) => {
        if (field.localId !== fieldId) return field
        return {
          ...field,
          options: field.options.map((option) =>
            option.localId === optionId ? { ...option, ...patch } : option
          ),
        }
      })
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {!fields.length ? (
        <p className="text-xs text-muted-foreground">{copy.empty}</p>
      ) : null}

      {fields.map((field) => (
        <div
          key={field.localId}
          className="flex flex-col gap-3 rounded-lg border border-input bg-background p-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor={`field-type-${field.localId}`}
                className="text-xs font-medium text-foreground"
              >
                {copy.type}
              </label>
              <select
                id={`field-type-${field.localId}`}
                value={field.type}
                onChange={(event) =>
                  patchField(field.localId, {
                    type: event.target.value as AutomationInputFieldType,
                  })
                }
                className={SELECT_CLASS}
              >
                <option value="select">{copy.typeSelect}</option>
                <option value="text">{copy.typeText}</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor={`field-key-${field.localId}`}
                className="text-xs font-medium text-foreground"
              >
                {copy.key}
              </label>
              <Input
                id={`field-key-${field.localId}`}
                value={field.key}
                onChange={(event) =>
                  patchField(field.localId, { key: event.target.value })
                }
                placeholder="mes"
                autoComplete="off"
                className={RECESSED_FIELD_CLASS}
              />
              <p className="text-xs text-muted-foreground">{hints.inputKey}</p>
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label
                htmlFor={`field-label-${field.localId}`}
                className="text-xs font-medium text-foreground"
              >
                {copy.label}
              </label>
              <Input
                id={`field-label-${field.localId}`}
                value={field.label}
                onChange={(event) =>
                  patchField(field.localId, { label: event.target.value })
                }
                placeholder="Mes a relanzar"
                autoComplete="off"
                className={RECESSED_FIELD_CLASS}
              />
            </div>
          </div>

          {field.type === 'select' ? (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-foreground">{copy.options}</p>
              {field.options.map((option) => (
                <div key={option.localId} className="flex items-center gap-2">
                  <Input
                    value={option.value}
                    onChange={(event) =>
                      patchOption(field.localId, option.localId, {
                        value: event.target.value,
                      })
                    }
                    placeholder={copy.optionValue}
                    aria-label={copy.optionValue}
                    autoComplete="off"
                    className={RECESSED_FIELD_CLASS}
                  />
                  <Input
                    value={option.label}
                    onChange={(event) =>
                      patchOption(field.localId, option.localId, {
                        label: event.target.value,
                      })
                    }
                    placeholder={copy.optionLabel}
                    aria-label={copy.optionLabel}
                    autoComplete="off"
                    className={RECESSED_FIELD_CLASS}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={field.options.length <= 1}
                    onClick={() =>
                      patchField(field.localId, {
                        options: field.options.filter(
                          (item) => item.localId !== option.localId
                        ),
                        defaultValue:
                          field.defaultValue === option.value.trim()
                            ? ''
                            : field.defaultValue,
                      })
                    }
                    aria-label={copy.removeOption}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-fit gap-1.5"
                onClick={() =>
                  patchField(field.localId, {
                    options: [...field.options, emptyDraftInputOption()],
                  })
                }
              >
                <Plus className="size-4" aria-hidden />
                {copy.addOption}
              </Button>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor={`field-default-${field.localId}`}
                className="text-xs font-medium text-foreground"
              >
                {field.type === 'text' ? copy.defaultTextValue : copy.defaultValue}
              </label>
              {field.type === 'text' ? (
                <Input
                  id={`field-default-${field.localId}`}
                  value={field.defaultValue}
                  onChange={(event) =>
                    patchField(field.localId, { defaultValue: event.target.value })
                  }
                  placeholder={copy.defaultTextPlaceholder}
                  autoComplete="off"
                  className={RECESSED_FIELD_CLASS}
                />
              ) : (
                <select
                  id={`field-default-${field.localId}`}
                  value={field.defaultValue}
                  onChange={(event) =>
                    patchField(field.localId, { defaultValue: event.target.value })
                  }
                  className={SELECT_CLASS}
                >
                  <option value="">{copy.noDefault}</option>
                  {field.options
                    .filter((option) => option.value.trim())
                    .map((option) => (
                      <option key={option.localId} value={option.value.trim()}>
                        {option.label.trim() || option.value.trim()}
                      </option>
                    ))}
                </select>
              )}
            </div>
            <label className="flex cursor-pointer items-center gap-2 sm:mt-6">
              <input
                type="checkbox"
                checked={field.required}
                onChange={(event) =>
                  patchField(field.localId, { required: event.target.checked })
                }
                className="size-4 cursor-pointer"
              />
              <span className="text-sm text-foreground">{copy.required}</span>
            </label>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-fit gap-1.5 text-destructive hover:text-destructive"
            onClick={() =>
              onChange(fields.filter((item) => item.localId !== field.localId))
            }
          >
            <Trash2 className="size-4" aria-hidden />
            {copy.removeField}
          </Button>
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => onChange([...fields, emptyDraftInputField('select')])}
        >
          <Plus className="size-4" aria-hidden />
          {copy.addSelectField}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => onChange([...fields, emptyDraftInputField('text')])}
        >
          <Plus className="size-4" aria-hidden />
          {copy.addTextField}
        </Button>
      </div>
    </div>
  )
}

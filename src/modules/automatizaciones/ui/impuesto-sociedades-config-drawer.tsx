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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { automatizaciones } from '@/content/automatizaciones'
import { cn } from '@/lib/utils'
import {
  createImpuestoSociedadesConfigAction,
  updateImpuestoSociedadesConfigAction,
} from '@/src/modules/automatizaciones/application/impuesto-sociedades-config-actions'
import {
  TIPO_EMPRESA_KEYS,
  type ImpuestoSociedadesConfig,
  type TipoEmpresaKey,
} from '@/src/modules/automatizaciones/domain/impuesto-sociedades-config'
import { PortalSideDrawer } from '@/src/modules/portal/ui/portal-side-drawer'

const FORM_ID = 'impuesto-sociedades-config-drawer-form'

const RECESSED_FIELD_CLASS =
  'border-input bg-background dark:border-input dark:bg-background'

const SELECT_FIELD_CLASS =
  'flex h-10 w-full cursor-pointer rounded-md border border-border bg-input px-3 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] dark:border-input dark:bg-background'

type FormState = {
  anio: string
  tipoEmpresaKey: TipoEmpresaKey
  esEscala: boolean
  tipoGravamenFijo: string
  baseGravamen: string
  tipoGravamenBase: string
  tipoGravamenRestante: string
}

const EMPTY_FORM: FormState = {
  anio: String(new Date().getFullYear()),
  tipoEmpresaKey: 'general',
  esEscala: false,
  tipoGravamenFijo: '25',
  baseGravamen: '50000',
  tipoGravamenBase: '23',
  tipoGravamenRestante: '23',
}

function formFromConfig(config: ImpuestoSociedadesConfig): FormState {
  return {
    anio: String(config.anio),
    tipoEmpresaKey: config.tipoEmpresaKey,
    esEscala: config.esEscala,
    tipoGravamenFijo:
      config.tipoGravamenFijo !== null ? String(config.tipoGravamenFijo) : '',
    baseGravamen:
      config.baseGravamen !== null ? String(config.baseGravamen) : '',
    tipoGravamenBase:
      config.tipoGravamenBase !== null ? String(config.tipoGravamenBase) : '',
    tipoGravamenRestante:
      config.tipoGravamenRestante !== null
        ? String(config.tipoGravamenRestante)
        : '',
  }
}

function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

type ImpuestoSociedadesConfigDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  config?: ImpuestoSociedadesConfig | null
}

export function ImpuestoSociedadesConfigDrawer({
  open,
  onOpenChange,
  onSaved,
  config = null,
}: ImpuestoSociedadesConfigDrawerProps) {
  const copy = automatizaciones.impuestoSociedadesConfig.drawer
  const tipoLabels = automatizaciones.impuestoSociedadesConfig.tipoEmpresa
  const isEdit = config !== null
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (!open) return
    setForm(config ? formFromConfig(config) : EMPTY_FORM)
  }, [open, config])

  function updateForm(patch: Partial<FormState>) {
    setForm((current) => ({ ...current, ...patch }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const payload = {
      anio: Number(form.anio),
      tipoEmpresaKey: form.tipoEmpresaKey,
      esEscala: form.esEscala,
      tipoGravamenFijo: form.esEscala
        ? null
        : parseOptionalNumber(form.tipoGravamenFijo),
      baseGravamen: form.esEscala
        ? parseOptionalNumber(form.baseGravamen)
        : null,
      tipoGravamenBase: form.esEscala
        ? parseOptionalNumber(form.tipoGravamenBase)
        : null,
      tipoGravamenRestante: form.esEscala
        ? parseOptionalNumber(form.tipoGravamenRestante)
        : null,
    }

    startTransition(async () => {
      const result = isEdit
        ? await updateImpuestoSociedadesConfigAction(config.id, payload)
        : await createImpuestoSociedadesConfigAction(payload)

      if (!result.ok) {
        toast.error(
          isEdit
            ? automatizaciones.impuestoSociedadesConfig.toast.updateFailed
            : automatizaciones.impuestoSociedadesConfig.toast.createFailed,
          { description: result.message }
        )
        return
      }

      toast.success(
        isEdit
          ? automatizaciones.impuestoSociedadesConfig.toast.updated
          : automatizaciones.impuestoSociedadesConfig.toast.created
      )
      onOpenChange(false)
      onSaved()
    })
  }

  return (
    <PortalSideDrawer open={open} onOpenChange={onOpenChange} size="wide">
      <DialogHeader className="border-b border-border px-6 py-5 pr-14 dark:border-border/50">
        <DialogTitle className="font-sans text-lg font-semibold">
          {isEdit ? copy.titleEdit : copy.titleCreate}
        </DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground">
          {copy.description}
        </DialogDescription>
      </DialogHeader>

      <form
        id={FORM_ID}
        onSubmit={handleSubmit}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
          <div className="grid gap-2">
            <label htmlFor="is-config-anio" className="text-sm font-medium">
              {copy.fields.anio}
            </label>
            <Input
              id="is-config-anio"
              type="number"
              inputMode="numeric"
              min={2000}
              max={2100}
              step={1}
              required
              value={form.anio}
              onChange={(event) => updateForm({ anio: event.target.value })}
              className={RECESSED_FIELD_CLASS}
            />
          </div>

          <div className="grid gap-2">
            <label htmlFor="is-config-tipo" className="text-sm font-medium">
              {copy.fields.tipoEmpresa}
            </label>
            <Select
              value={form.tipoEmpresaKey}
              onValueChange={(next) =>
                updateForm({ tipoEmpresaKey: next as TipoEmpresaKey })
              }
            >
              <SelectTrigger
                id="is-config-tipo"
                disabled={isEdit}
                aria-label={copy.fields.tipoEmpresa}
                className={cn(
                  SELECT_FIELD_CLASS,
                  isEdit && 'cursor-not-allowed opacity-60'
                )}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPO_EMPRESA_KEYS.map((key) => (
                  <SelectItem key={key} value={key}>
                    {tipoLabels[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border px-4 py-3 dark:border-border/50">
            <input
              type="checkbox"
              checked={form.esEscala}
              onChange={(event) =>
                updateForm({ esEscala: event.target.checked })
              }
              className="mt-0.5 size-4 shrink-0 cursor-pointer accent-primary"
            />
            <span className="flex flex-col gap-1">
              <span className="text-sm font-medium">{copy.fields.esEscala}</span>
              <span className="text-xs text-muted-foreground">
                {copy.hints.esEscala}
              </span>
            </span>
          </label>

          {form.esEscala ? (
            <div className="grid gap-4 rounded-xl border border-border bg-muted/30 p-4 dark:border-border/50">
              <div className="grid gap-2">
                <label htmlFor="is-config-base" className="text-sm font-medium">
                  {copy.fields.baseGravamen}
                </label>
                <Input
                  id="is-config-base"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  required
                  value={form.baseGravamen}
                  onChange={(event) =>
                    updateForm({ baseGravamen: event.target.value })
                  }
                  className={RECESSED_FIELD_CLASS}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <label
                    htmlFor="is-config-tipo-base"
                    className="text-sm font-medium"
                  >
                    {copy.fields.tipoGravamenBase}
                  </label>
                  <Input
                    id="is-config-tipo-base"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={100}
                    step="0.01"
                    required
                    value={form.tipoGravamenBase}
                    onChange={(event) =>
                      updateForm({ tipoGravamenBase: event.target.value })
                    }
                    className={RECESSED_FIELD_CLASS}
                  />
                </div>
                <div className="grid gap-2">
                  <label
                    htmlFor="is-config-tipo-resto"
                    className="text-sm font-medium"
                  >
                    {copy.fields.tipoGravamenRestante}
                  </label>
                  <Input
                    id="is-config-tipo-resto"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={100}
                    step="0.01"
                    required
                    value={form.tipoGravamenRestante}
                    onChange={(event) =>
                      updateForm({ tipoGravamenRestante: event.target.value })
                    }
                    className={RECESSED_FIELD_CLASS}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-2">
              <label htmlFor="is-config-fijo" className="text-sm font-medium">
                {copy.fields.tipoGravamenFijo}
              </label>
              <Input
                id="is-config-fijo"
                type="number"
                inputMode="decimal"
                min={0}
                max={100}
                step="0.01"
                required
                value={form.tipoGravamenFijo}
                onChange={(event) =>
                  updateForm({ tipoGravamenFijo: event.target.value })
                }
                className={RECESSED_FIELD_CLASS}
              />
              <p className="text-xs text-muted-foreground">
                {copy.hints.tipoGravamenFijo}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border px-6 py-4 sm:flex-row sm:justify-end dark:border-border/50">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            {copy.actions.cancel}
          </Button>
          <Button type="submit" form={FORM_ID} disabled={pending} className="gap-2">
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {isEdit
                  ? copy.actions.submittingEdit
                  : copy.actions.submittingCreate}
              </>
            ) : isEdit ? (
              copy.actions.submitEdit
            ) : (
              copy.actions.submitCreate
            )}
          </Button>
        </div>
      </form>
    </PortalSideDrawer>
  )
}

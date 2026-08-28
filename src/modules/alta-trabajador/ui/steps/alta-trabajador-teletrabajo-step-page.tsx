'use client'

import { useRouter } from 'next/navigation'
import { useId, useState, type FormEvent } from 'react'

import { altaTrabajadorWizard } from '@/content/alta-trabajador-wizard'
import { tramiteSolicitudes } from '@/content/tramite-solicitudes'
import { Button } from '@/components/ui/button'
import { parseWeekdaysCsv } from '@/lib/weekdays'
import type { AltaTrabajadorFormValues } from '@/src/modules/alta-trabajador/domain/alta-trabajador-form-types'
import {
  showsTeleworkFields,
  showsTeleworkScheduleSplit,
} from '@/src/modules/alta-trabajador/domain/build-alta-trabajador-payload'
import { validateAltaTrabajadorStep } from '@/src/modules/alta-trabajador/domain/validate-alta-trabajador-step'
import {
  AltaTrabajadorAddressFieldGroup,
  type AltaTrabajadorAddressValue,
} from '@/src/modules/alta-trabajador/ui/alta-trabajador-address-field-group'
import { AltaTrabajadorConditionalBlock } from '@/src/modules/alta-trabajador/ui/alta-trabajador-conditional-block'
import { AltaTrabajadorWeekdayMultiSelect } from '@/src/modules/alta-trabajador/ui/alta-trabajador-weekday-multi-select'
import {
  AltaTrabajadorWizardShell,
  mapAltaTrabajadorStepErrors,
} from '@/src/modules/alta-trabajador/ui/alta-trabajador-wizard-shell'
import { useAltaTrabajadorWizard } from '@/src/modules/alta-trabajador/ui/alta-trabajador-wizard-context'
import { useAltaTrabajadorStepSession } from '@/src/modules/alta-trabajador/ui/use-alta-trabajador-step-session'
import {
  TramiteDrawerField,
  TramiteDrawerSelect,
} from '@/src/modules/tramites/ui/tramite-drawer-field'

const FORM_ID = 'alta-trabajador-teletrabajo'

const TELEWORK_FIELDS: (keyof AltaTrabajadorFormValues)[] = [
  'teleworkAddressStreet',
  'teleworkAddressNumber',
  'teleworkAddressCity',
  'teleworkAddressProvince',
  'teleworkAddressPostalCode',
  'teleworkEquipment',
  'teleworkAmountAgreed',
  'teleworkFullTime',
  'teleworkDaysRemote',
  'teleworkDaysOnsite',
]

export function AltaTrabajadorTeletrabajoStepPage() {
  useAltaTrabajadorStepSession('teletrabajo')
  const router = useRouter()
  const baseId = useId()
  const { values, attachment, setField, setValues } = useAltaTrabajadorWizard()
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const altaCopy = tramiteSolicitudes.altaTrabajador.fields
  const stepCopy = altaTrabajadorWizard.steps.teletrabajo

  const handleTeleworkAddressChange = (
    field: keyof AltaTrabajadorAddressValue,
    value: string
  ) => {
    if (field === 'street') setField('teleworkAddressStreet', value)
    else if (field === 'number') setField('teleworkAddressNumber', value)
    else if (field === 'city') setField('teleworkAddressCity', value)
    else if (field === 'province') setField('teleworkAddressProvince', value)
    else setField('teleworkAddressPostalCode', value)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const mapped = mapAltaTrabajadorStepErrors(
      validateAltaTrabajadorStep('teletrabajo', values, attachment)
    )
    setFieldErrors(mapped)
    if (Object.keys(mapped).length > 0) return
    router.push('/alta-trabajador/retribucion-horario')
  }

  return (
    <AltaTrabajadorWizardShell
      stepId="teletrabajo"
      title={stepCopy.title}
      description={stepCopy.description}
      formId={FORM_ID}
    >
      <form id={FORM_ID} className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <TramiteDrawerSelect
          id={`${baseId}-isTelework`}
          name="isTelework"
          label={altaCopy.isTelework.label}
          placeholder={altaCopy.isTelework.placeholder}
          value={values.isTelework}
          error={fieldErrors.isTelework}
          required
          options={altaCopy.isTelework.options}
          onChange={(isTelework) => {
            const patch: Partial<AltaTrabajadorFormValues> = { isTelework }
            if (isTelework !== 'si') {
              for (const field of TELEWORK_FIELDS) patch[field] = ''
            }
            setValues(patch)
          }}
        />
        {altaCopy.isTelework.hint ? (
          <p className="-mt-2 text-xs text-muted-foreground">{altaCopy.isTelework.hint}</p>
        ) : null}

        <AltaTrabajadorConditionalBlock show={showsTeleworkFields(values)}>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-foreground">
                {altaCopy.teleworkAddressSectionTitle}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="cursor-pointer"
                onClick={() =>
                  setValues({
                    teleworkAddressStreet: values.addressStreet,
                    teleworkAddressNumber: values.addressNumber,
                    teleworkAddressCity: values.addressCity,
                    teleworkAddressProvince: values.addressProvince,
                    teleworkAddressPostalCode: values.addressPostalCode,
                  })
                }
              >
                {altaCopy.teleworkAddressSameAsHome}
              </Button>
            </div>
            <AltaTrabajadorAddressFieldGroup
              idPrefix={`${baseId}-teleworkAddress`}
              namePrefix="teleworkAddress"
              value={{
                street: values.teleworkAddressStreet,
                number: values.teleworkAddressNumber,
                city: values.teleworkAddressCity,
                province: values.teleworkAddressProvince,
                postalCode: values.teleworkAddressPostalCode,
              }}
              errors={{
                street: fieldErrors.teleworkAddressStreet,
                number: fieldErrors.teleworkAddressNumber,
                city: fieldErrors.teleworkAddressCity,
                province: fieldErrors.teleworkAddressProvince,
                postalCode: fieldErrors.teleworkAddressPostalCode,
              }}
              required
              onChange={handleTeleworkAddressChange}
            />
            <TramiteDrawerField
              id={`${baseId}-teleworkEquipment`}
              name="teleworkEquipment"
              label={altaCopy.teleworkEquipment.label}
              placeholder={altaCopy.teleworkEquipment.placeholder}
              value={values.teleworkEquipment}
              error={fieldErrors.teleworkEquipment}
              required
              onChange={(value) => setField('teleworkEquipment', value)}
            />
            <TramiteDrawerField
              id={`${baseId}-teleworkAmountAgreed`}
              name="teleworkAmountAgreed"
              label={altaCopy.teleworkAmountAgreed.label}
              placeholder={altaCopy.teleworkAmountAgreed.placeholder}
              value={values.teleworkAmountAgreed}
              error={fieldErrors.teleworkAmountAgreed}
              required
              onChange={(value) => setField('teleworkAmountAgreed', value)}
            />
            <TramiteDrawerSelect
              id={`${baseId}-teleworkFullTime`}
              name="teleworkFullTime"
              label={altaCopy.teleworkFullTime.label}
              placeholder={altaCopy.teleworkFullTime.placeholder}
              value={values.teleworkFullTime}
              error={fieldErrors.teleworkFullTime}
              required
              options={altaCopy.teleworkFullTime.options}
              onChange={(teleworkFullTime) =>
                setValues({
                  teleworkFullTime,
                  ...(teleworkFullTime !== 'no'
                    ? { teleworkDaysRemote: '', teleworkDaysOnsite: '' }
                    : {}),
                })
              }
            />
            {showsTeleworkScheduleSplit(values) ? (
              <>
                <AltaTrabajadorWeekdayMultiSelect
                  id={`${baseId}-teleworkDaysRemote`}
                  label={altaCopy.teleworkDaysRemote.label}
                  value={values.teleworkDaysRemote}
                  options={altaCopy.workDays.options}
                  error={fieldErrors.teleworkDaysRemote}
                  disabledDays={parseWeekdaysCsv(values.teleworkDaysOnsite)}
                  required
                  onChange={(csv) => setField('teleworkDaysRemote', csv)}
                />
                <AltaTrabajadorWeekdayMultiSelect
                  id={`${baseId}-teleworkDaysOnsite`}
                  label={altaCopy.teleworkDaysOnsite.label}
                  value={values.teleworkDaysOnsite}
                  options={altaCopy.workDays.options}
                  error={fieldErrors.teleworkDaysOnsite}
                  disabledDays={parseWeekdaysCsv(values.teleworkDaysRemote)}
                  required
                  onChange={(csv) => setField('teleworkDaysOnsite', csv)}
                />
              </>
            ) : null}
          </div>
        </AltaTrabajadorConditionalBlock>
      </form>
    </AltaTrabajadorWizardShell>
  )
}

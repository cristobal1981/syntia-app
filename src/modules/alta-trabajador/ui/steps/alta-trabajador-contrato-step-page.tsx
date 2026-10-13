'use client'

import { useRouter } from 'next/navigation'
import { useId, useState, type FormEvent } from 'react'

import { altaTrabajadorWizard } from '@/content/alta-trabajador-wizard'
import { tramiteSolicitudes } from '@/content/tramite-solicitudes'
import type { AltaTrabajadorFormValues } from '@/src/modules/alta-trabajador/domain/alta-trabajador-form-types'
import {
  showsContractEndDate,
  showsOtherContractReasonFields,
  showsOtherTemporaryReasonFields,
  showsSubstituteEmployeeField,
  showsTemporaryIncreaseFields,
  showsTemporaryReasonFields,
  showsTrainingFields,
  showsTrainingScholarshipAmount,
  showsVacationSubstitutionFields,
} from '@/src/modules/alta-trabajador/domain/build-alta-trabajador-payload'
import { validateAltaTrabajadorStep } from '@/src/modules/alta-trabajador/domain/validate-alta-trabajador-step'
import { AltaTrabajadorConditionalBlock } from '@/src/modules/alta-trabajador/ui/alta-trabajador-conditional-block'
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

const FORM_ID = 'alta-trabajador-contrato'

const CONTRACT_TYPE_CONDITIONAL_FIELDS: (keyof AltaTrabajadorFormValues)[] = [
  'temporaryReason',
  'temporaryIncreaseCauses',
  'temporaryDurationReason',
  'vacationSubstitutionDetails',
  'employeeToSubstitute',
  'otherTemporaryReasonDetail',
  'trainingType',
  'trainingHasScholarship',
  'trainingScholarshipAmount',
  'trainingScholarshipPayer',
  'otherContractReason',
  'contractEndDate',
]

const TEMPORARY_REASON_CONDITIONAL_FIELDS: (keyof AltaTrabajadorFormValues)[] = [
  'temporaryIncreaseCauses',
  'temporaryDurationReason',
  'vacationSubstitutionDetails',
  'employeeToSubstitute',
  'otherTemporaryReasonDetail',
  'contractEndDate',
]

export function AltaTrabajadorContratoStepPage() {
  useAltaTrabajadorStepSession('contrato')
  const router = useRouter()
  const baseId = useId()
  const { values, attachment, setField, setValues } = useAltaTrabajadorWizard()
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const altaCopy = tramiteSolicitudes.altaTrabajador.fields
  const wizardFields = altaTrabajadorWizard.fields
  const stepCopy = altaTrabajadorWizard.steps.contrato

  const clearFields = (fields: (keyof AltaTrabajadorFormValues)[]) => {
    const patch: Partial<AltaTrabajadorFormValues> = {}
    for (const field of fields) patch[field] = ''
    return patch
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const mapped = mapAltaTrabajadorStepErrors(
      validateAltaTrabajadorStep('contrato', values, attachment)
    )
    setFieldErrors(mapped)
    if (Object.keys(mapped).length > 0) return
    router.push('/alta-trabajador/teletrabajo')
  }

  return (
    <AltaTrabajadorWizardShell
      stepId="contrato"
      title={stepCopy.title}
      description={stepCopy.description}
      formId={FORM_ID}
    >
      <form id={FORM_ID} className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <TramiteDrawerSelect
          id={`${baseId}-contractType`}
          name="contractType"
          label={altaCopy.contractType.label}
          placeholder={altaCopy.contractType.placeholder}
          value={values.contractType}
          error={fieldErrors.contractType}
          required
          options={altaCopy.contractType.options}
          onChange={(contractType) =>
            setValues({ contractType, ...clearFields(CONTRACT_TYPE_CONDITIONAL_FIELDS) })
          }
        />

        <AltaTrabajadorConditionalBlock show={showsTemporaryReasonFields(values)}>
          <div className="flex flex-col gap-4">
            <TramiteDrawerSelect
              id={`${baseId}-temporaryReason`}
              name="temporaryReason"
              label={altaCopy.temporaryReason.label}
              placeholder={altaCopy.temporaryReason.placeholder}
              value={values.temporaryReason}
              error={fieldErrors.temporaryReason}
              required
              options={altaCopy.temporaryReason.options}
              onChange={(temporaryReason) =>
                setValues({
                  temporaryReason,
                  ...clearFields(TEMPORARY_REASON_CONDITIONAL_FIELDS),
                })
              }
            />

            {showsTemporaryIncreaseFields(values) ? (
              <>
                <TramiteDrawerField
                  id={`${baseId}-temporaryIncreaseCauses`}
                  name="temporaryIncreaseCauses"
                  label={altaCopy.temporaryIncreaseCauses.label}
                  placeholder={altaCopy.temporaryIncreaseCauses.placeholder}
                  value={values.temporaryIncreaseCauses}
                  error={fieldErrors.temporaryIncreaseCauses}
                  required
                  onChange={(value) => setField('temporaryIncreaseCauses', value)}
                />
                <TramiteDrawerField
                  id={`${baseId}-temporaryDurationReason`}
                  name="temporaryDurationReason"
                  label={altaCopy.temporaryDurationReason.label}
                  placeholder={altaCopy.temporaryDurationReason.placeholder}
                  value={values.temporaryDurationReason}
                  error={fieldErrors.temporaryDurationReason}
                  required
                  onChange={(value) => setField('temporaryDurationReason', value)}
                />
              </>
            ) : null}

            {showsVacationSubstitutionFields(values) ? (
              <TramiteDrawerField
                id={`${baseId}-vacationSubstitutionDetails`}
                name="vacationSubstitutionDetails"
                label={altaCopy.vacationSubstitutionDetails.label}
                placeholder={altaCopy.vacationSubstitutionDetails.placeholder}
                value={values.vacationSubstitutionDetails}
                error={fieldErrors.vacationSubstitutionDetails}
                required
                onChange={(value) => setField('vacationSubstitutionDetails', value)}
              />
            ) : null}

            {showsSubstituteEmployeeField(values) ? (
              <TramiteDrawerField
                id={`${baseId}-employeeToSubstitute`}
                name="employeeToSubstitute"
                label={altaCopy.employeeToSubstitute.label}
                placeholder={altaCopy.employeeToSubstitute.placeholder}
                value={values.employeeToSubstitute}
                error={fieldErrors.employeeToSubstitute}
                required
                onChange={(value) => setField('employeeToSubstitute', value)}
              />
            ) : null}

            {showsOtherTemporaryReasonFields(values) ? (
              <TramiteDrawerField
                id={`${baseId}-otherTemporaryReasonDetail`}
                name="otherTemporaryReasonDetail"
                label={altaCopy.otherTemporaryReasonDetail.label}
                placeholder={altaCopy.otherTemporaryReasonDetail.placeholder}
                value={values.otherTemporaryReasonDetail}
                error={fieldErrors.otherTemporaryReasonDetail}
                required
                onChange={(value) => setField('otherTemporaryReasonDetail', value)}
              />
            ) : null}
          </div>
        </AltaTrabajadorConditionalBlock>

        <AltaTrabajadorConditionalBlock show={showsTrainingFields(values)}>
          <div className="flex flex-col gap-4">
            <TramiteDrawerSelect
              id={`${baseId}-trainingType`}
              name="trainingType"
              label={altaCopy.trainingType.label}
              placeholder={altaCopy.trainingType.placeholder}
              value={values.trainingType}
              error={fieldErrors.trainingType}
              required
              options={altaCopy.trainingType.options}
              onChange={(value) => setField('trainingType', value)}
            />
            <TramiteDrawerSelect
              id={`${baseId}-trainingHasScholarship`}
              name="trainingHasScholarship"
              label={altaCopy.trainingHasScholarship.label}
              placeholder={altaCopy.trainingHasScholarship.placeholder}
              value={values.trainingHasScholarship}
              error={fieldErrors.trainingHasScholarship}
              required
              options={altaCopy.trainingHasScholarship.options}
              onChange={(trainingHasScholarship) =>
                setValues({
                  trainingHasScholarship,
                  ...(trainingHasScholarship !== 'si'
                    ? { trainingScholarshipAmount: '', trainingScholarshipPayer: '' }
                    : {}),
                })
              }
            />
            {showsTrainingScholarshipAmount(values) ? (
              <>
                <TramiteDrawerField
                  id={`${baseId}-trainingScholarshipAmount`}
                  name="trainingScholarshipAmount"
                  label={altaCopy.trainingScholarshipAmount.label}
                  placeholder={altaCopy.trainingScholarshipAmount.placeholder}
                  value={values.trainingScholarshipAmount}
                  error={fieldErrors.trainingScholarshipAmount}
                  required
                  onChange={(value) => setField('trainingScholarshipAmount', value)}
                />
                <TramiteDrawerField
                  id={`${baseId}-trainingScholarshipPayer`}
                  name="trainingScholarshipPayer"
                  label={altaCopy.trainingScholarshipPayer.label}
                  placeholder={altaCopy.trainingScholarshipPayer.placeholder}
                  value={values.trainingScholarshipPayer}
                  error={fieldErrors.trainingScholarshipPayer}
                  required
                  onChange={(value) => setField('trainingScholarshipPayer', value)}
                />
              </>
            ) : null}
          </div>
        </AltaTrabajadorConditionalBlock>

        <AltaTrabajadorConditionalBlock show={showsOtherContractReasonFields(values)}>
          <TramiteDrawerField
            id={`${baseId}-otherContractReason`}
            name="otherContractReason"
            label={altaCopy.otherContractReason.label}
            placeholder={altaCopy.otherContractReason.placeholder}
            value={values.otherContractReason}
            error={fieldErrors.otherContractReason}
            required
            onChange={(value) => setField('otherContractReason', value)}
          />
        </AltaTrabajadorConditionalBlock>

        <AltaTrabajadorConditionalBlock show={showsContractEndDate(values)}>
          <TramiteDrawerField
            id={`${baseId}-contractEndDate`}
            name="contractEndDate"
            type="date"
            label={wizardFields.contractEndDate.label}
            value={values.contractEndDate}
            error={fieldErrors.contractEndDate}
            required
            onChange={(contractEndDate) => setField('contractEndDate', contractEndDate)}
          />
          {wizardFields.contractEndDate.hint ? (
            <p className="mt-2 text-xs text-muted-foreground">
              {wizardFields.contractEndDate.hint}
            </p>
          ) : null}
        </AltaTrabajadorConditionalBlock>
      </form>
    </AltaTrabajadorWizardShell>
  )
}

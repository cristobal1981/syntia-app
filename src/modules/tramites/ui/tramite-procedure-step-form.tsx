import type { FormEvent } from 'react'

import {
  TramiteBajaAutonomoForm,
  TramiteBajaServicioForm,
  type BajaAutonomoFormValues,
  type BajaServicioFormValues,
} from '@/src/modules/tramites/ui/tramite-baja-cliente-forms'
import {
  TramiteCartaVacacionesForm,
  type CartaVacacionesFormValues,
} from '@/src/modules/tramites/ui/tramite-carta-vacaciones-form'
import { PROCEDURE_FORM_ID } from '@/src/modules/tramites/ui/tramite-create-consulta-helpers'
import {
  TramiteTrabajadorForm,
  type TrabajadorFormValues,
} from '@/src/modules/tramites/ui/tramite-trabajador-form'

type TramiteProcedureStepFormProps = {
  step: 'baja-trabajador' | 'carta-vacaciones' | 'baja-autonomo' | 'baja-servicio'
  trabajadorValues: TrabajadorFormValues
  onTrabajadorChange: (values: TrabajadorFormValues) => void
  cartaValues: CartaVacacionesFormValues
  onCartaChange: (values: CartaVacacionesFormValues) => void
  bajaAutonomoValues: BajaAutonomoFormValues
  onBajaAutonomoChange: (values: BajaAutonomoFormValues) => void
  bajaServicioValues: BajaServicioFormValues
  onBajaServicioChange: (values: BajaServicioFormValues) => void
  pending: boolean
  fieldErrors: Record<string, string>
  formError: string | null
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function TramiteProcedureStepForm({
  step,
  trabajadorValues,
  onTrabajadorChange,
  cartaValues,
  onCartaChange,
  bajaAutonomoValues,
  onBajaAutonomoChange,
  bajaServicioValues,
  onBajaServicioChange,
  pending,
  fieldErrors,
  formError,
  onSubmit,
}: TramiteProcedureStepFormProps) {
  return (
    <form id={PROCEDURE_FORM_ID} className="flex flex-col gap-5 px-6 py-5" onSubmit={onSubmit}>
      {step === 'baja-trabajador' ? (
        <TramiteTrabajadorForm
          mode="baja"
          values={trabajadorValues}
          fieldErrors={fieldErrors}
          disabled={pending}
          onChange={onTrabajadorChange}
        />
      ) : step === 'baja-autonomo' ? (
        <TramiteBajaAutonomoForm
          values={bajaAutonomoValues}
          fieldErrors={fieldErrors}
          disabled={pending}
          onChange={onBajaAutonomoChange}
        />
      ) : step === 'baja-servicio' ? (
        <TramiteBajaServicioForm
          values={bajaServicioValues}
          fieldErrors={fieldErrors}
          disabled={pending}
          onChange={onBajaServicioChange}
        />
      ) : (
        <TramiteCartaVacacionesForm
          values={cartaValues}
          fieldErrors={fieldErrors}
          disabled={pending}
          onChange={onCartaChange}
        />
      )}

      {formError ? (
        <p className="text-sm text-destructive" role="alert" aria-live="polite">
          {formError}
        </p>
      ) : null}
    </form>
  )
}

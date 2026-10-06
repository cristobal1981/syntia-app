'use client'

import { useCallback, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { profile } from '@/content/profile'
import { submitProfileChangeAction } from '@/src/modules/profile/application/submit-profile-change-action'
import type {
  ClientProfile,
  ProfileChangeApiResponse,
} from '@/src/modules/profile/domain/types'
import {
  lookupPostalCode,
  mapProfileChangeError,
} from '@/src/modules/profile/ui/profile-change-helpers'

export function useProfileChangeForm(
  initialProfile: ClientProfile,
  open: boolean,
  onOpenChange: (open: boolean) => void
) {
  const router = useRouter()
  const [formValues, setFormValues] = useState({
    name: initialProfile.name,
    email: initialProfile.email,
    phone: initialProfile.phone,
    vat: initialProfile.vat,
    iban: initialProfile.iban,
    address: { ...initialProfile.address },
  })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false)
  const [pending, setPending] = useState(false)

  const resetForm = useCallback(() => {
    setFormValues({
      name: initialProfile.name,
      email: initialProfile.email,
      phone: initialProfile.phone,
      vat: initialProfile.vat,
      iban: initialProfile.iban,
      address: { ...initialProfile.address },
    })
    setFieldErrors({})
  }, [initialProfile])

  // Ajuste durante el render (no en un efecto): limpia el formulario al
  // cerrar el diálogo.
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (!open) {
      resetForm()
    }
  }

  const hasUnsavedChanges =
    formValues.name !== initialProfile.name ||
    formValues.email !== initialProfile.email ||
    formValues.phone !== initialProfile.phone ||
    formValues.vat !== initialProfile.vat ||
    formValues.iban !== initialProfile.iban ||
    formValues.address.line1 !== initialProfile.address.line1 ||
    formValues.address.line2 !== initialProfile.address.line2 ||
    formValues.address.postalCode !== initialProfile.address.postalCode ||
    formValues.address.city !== initialProfile.address.city ||
    formValues.address.province !== initialProfile.address.province ||
    formValues.address.country !== initialProfile.address.country

  const handleOpenChange = (next: boolean) => {
    if (!next && hasUnsavedChanges && !pending) {
      setDiscardConfirmOpen(true)
      return
    }
    onOpenChange(next)
  }

  const handleConfirmDiscard = () => {
    resetForm()
    onOpenChange(false)
  }

  const handleSubmitResult = (result: ProfileChangeApiResponse) => {
    if (result.ok) {
      toast.success(profile.successToast)
      onOpenChange(false)
      resetForm()
      router.refresh()
      return
    }

    if (result.error === 'validation') {
      const formMessage = result.fieldErrors?._form
      if (formMessage) {
        toast.error(formMessage)
      }
      setFieldErrors(
        Object.fromEntries(
          Object.entries(result.fieldErrors ?? {}).filter(([key]) => key !== '_form')
        )
      )
      return
    }

    toast.error(mapProfileChangeError(result.error))
    setFieldErrors({})
  }

  const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (pending) return

    setFieldErrors({})
    setPending(true)

    try {
      const result = await submitProfileChangeAction({
        website: '',
        name: formValues.name,
        email: formValues.email,
        phone: formValues.phone,
        vat: formValues.vat,
        iban: formValues.iban,
        address: formValues.address,
      })

      handleSubmitResult(result)
    } catch {
      toast.error(profile.errors.create_failed)
      setFieldErrors({})
    } finally {
      setPending(false)
    }
  }

  const handlePostalBlur = async (postalCode: string) => {
    const lookup = await lookupPostalCode(postalCode)
    if (!lookup) return

    setFormValues((current) => ({
      ...current,
      address: {
        ...current.address,
        postalCode,
        city: current.address.city || lookup.city,
        province: current.address.province || lookup.province,
      },
    }))
  }

  return {
    formValues,
    setFormValues,
    fieldErrors,
    discardConfirmOpen,
    setDiscardConfirmOpen,
    pending,
    handleOpenChange,
    handleConfirmDiscard,
    handleFormSubmit,
    handlePostalBlur,
  }
}

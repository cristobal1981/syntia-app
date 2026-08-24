'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { colaboradores } from '@/content/colaboradores'
import {
  createWorkerAction,
  updateWorkerGrantAction,
} from '@/src/modules/colaboradores/application/actions'
import {
  WORKER_SECTION_HREFS,
  type WorkerRecord,
  type WorkerSectionHref,
} from '@/src/modules/colaboradores/domain/types'

const copy = colaboradores.form

function emailDomain(email: string): string {
  const at = email.lastIndexOf('@')
  return at === -1 ? '' : email.slice(at + 1).trim().toLowerCase()
}

type WorkerFormDialogProps = {
  mode: 'create' | 'edit'
  worker?: WorkerRecord
  ownerEmail: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function WorkerFormDialog({
  mode,
  worker,
  ownerEmail,
  open,
  onOpenChange,
  onSuccess,
}: WorkerFormDialogProps) {
  const isCreate = mode === 'create'
  const [firstName, setFirstName] = useState(worker?.firstName ?? '')
  const [firstSurname, setFirstSurname] = useState(worker?.firstSurname ?? '')
  const [secondSurname, setSecondSurname] = useState(worker?.secondSurname ?? '')
  const [email, setEmail] = useState(worker?.email ?? '')
  const [sections, setSections] = useState<Set<WorkerSectionHref>>(
    new Set(worker?.allowedSections ?? [])
  )
  const [isEnabled, setIsEnabled] = useState(worker?.isEnabled ?? true)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!open) return
    setFirstName(worker?.firstName ?? '')
    setFirstSurname(worker?.firstSurname ?? '')
    setSecondSurname(worker?.secondSurname ?? '')
    setEmail(worker?.email ?? '')
    setSections(new Set(worker?.allowedSections ?? []))
    setIsEnabled(worker?.isEnabled ?? true)
  }, [open, worker])

  const ownerDomain = emailDomain(ownerEmail)
  const candidateDomain = emailDomain(email)
  const showDomainWarning =
    isCreate && candidateDomain.length > 0 && ownerDomain.length > 0 && candidateDomain !== ownerDomain

  function toggleSection(href: WorkerSectionHref) {
    setSections((prev) => {
      const next = new Set(prev)
      if (next.has(href)) next.delete(href)
      else next.add(href)
      return next
    })
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)

    const result = isCreate
      ? await createWorkerAction({
          firstName: firstName.trim(),
          firstSurname: firstSurname.trim(),
          secondSurname: secondSurname.trim() || undefined,
          email: email.trim(),
          allowedSections: [...sections],
        })
      : await updateWorkerGrantAction({
          workerUserId: worker!.id,
          allowedSections: [...sections],
          isEnabled,
        })

    setPending(false)

    if (!result.ok) {
      toast.error(copy.errors[result.error] ?? copy.errors.create_failed)
      return
    }

    toast.success(isCreate ? copy.successCreate : copy.successUpdate)
    onOpenChange(false)
    onSuccess()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{isCreate ? copy.createTitle : copy.editTitle}</DialogTitle>
            <DialogDescription>{colaboradores.description}</DialogDescription>
          </DialogHeader>

          {isCreate ? (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1 text-sm">
                  {copy.firstName}
                  <Input
                    required
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  {copy.firstSurname}
                  <Input
                    required
                    value={firstSurname}
                    onChange={(event) => setFirstSurname(event.target.value)}
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1 text-sm">
                {copy.secondSurname}
                <Input
                  value={secondSurname}
                  onChange={(event) => setSecondSurname(event.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                {copy.email}
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
              {showDomainWarning ? (
                <p className="text-sm text-amber-600 dark:text-amber-500" role="alert">
                  {copy.domainMismatch.replace('{domain}', ownerDomain)}
                </p>
              ) : null}
            </div>
          ) : null}

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-foreground">
              {copy.sectionsLabel}
            </legend>
            {WORKER_SECTION_HREFS.map((href) => (
              <label key={href} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={sections.has(href)}
                  onChange={() => toggleSection(href)}
                  className="size-4 rounded border-input"
                />
                {colaboradores.sections[href]}
              </label>
            ))}
          </fieldset>

          {!isCreate ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={(event) => setIsEnabled(event.target.checked)}
                className="size-4 rounded border-input"
              />
              {copy.isEnabledLabel}
            </label>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {copy.cancel}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending
                ? isCreate
                  ? copy.creating
                  : copy.saving
                : isCreate
                  ? copy.create
                  : copy.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

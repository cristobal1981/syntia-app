'use client'

import { useState, type FormEvent, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { colaboradores } from '@/content/colaboradores'
import {
  createWorkerAction,
  updateWorkerGrantAction,
} from '@/src/modules/colaboradores/application/actions'
import {
  WORKER_SECTION_HREFS,
  WORKER_SECTIONS_WITH_WRITE,
  type WorkerRecord,
  type WorkerSectionGrants,
  type WorkerSectionHref,
} from '@/src/modules/colaboradores/domain/types'
import {
  WORKER_ROLE_TEMPLATE_KEYS,
  WORKER_ROLE_TEMPLATES,
} from '@/src/modules/colaboradores/domain/worker-role-templates'
import type { NavIconId } from '@/src/modules/portal/domain/types'
import { PortalNavIcon } from '@/src/modules/portal/ui/portal-nav-icon'
import { PortalSideDrawer } from '@/src/modules/portal/ui/portal-side-drawer'

const copy = colaboradores.form
const FORM_ID = 'worker-form-drawer-form'
const SECTIONS_WITH_WRITE = new Set(WORKER_SECTIONS_WITH_WRITE)

/** Campos "hundidos" sobre el panel bg-card del drawer: contraste en dark mode. */
const RECESSED_FIELD_CLASS =
  'border-input bg-background dark:border-input dark:bg-background'

const SELECT_FIELD_CLASS =
  'h-9 w-36 cursor-pointer rounded-md border border-input bg-background px-3 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] dark:border-input dark:bg-background'

/** Mismo icono que ya usa cada sección en la navegación del portal. */
const SECTION_ICON: Record<WorkerSectionHref, NavIconId> = {
  '/tramites': 'procedures',
  '/obligaciones': 'obligations',
  '/documentos': 'documents',
  '/firmas': 'signatures',
  '/guias': 'guides',
}

function emailDomain(email: string): string {
  const at = email.lastIndexOf('@')
  return at === -1 ? '' : email.slice(at + 1).trim().toLowerCase()
}

function DrawerField({
  id,
  label,
  children,
}: {
  id: string
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
    </div>
  )
}

function GroupHeading({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <h3 className="text-sm font-semibold text-foreground">{children}</h3>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

type WorkerFormDrawerProps = {
  mode: 'create' | 'edit'
  worker?: WorkerRecord
  ownerEmail: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function WorkerFormDrawer({
  mode,
  worker,
  ownerEmail,
  open,
  onOpenChange,
  onSuccess,
}: WorkerFormDrawerProps) {
  const isCreate = mode === 'create'
  const [firstName, setFirstName] = useState(worker?.firstName ?? '')
  const [firstSurname, setFirstSurname] = useState(worker?.firstSurname ?? '')
  const [secondSurname, setSecondSurname] = useState(worker?.secondSurname ?? '')
  const [email, setEmail] = useState(worker?.email ?? '')
  const [sections, setSections] = useState<WorkerSectionGrants>(
    worker?.allowedSections ?? {}
  )
  const [isEnabled, setIsEnabled] = useState(worker?.isEnabled ?? true)
  const [pending, setPending] = useState(false)

  // Ajuste durante el render (no en un efecto): resiembra el formulario con
  // el `worker` actual cada vez que el diálogo se abre (o cambia el
  // registro a editar mientras está abierto).
  const [prevOpen, setPrevOpen] = useState(open)
  const [prevWorker, setPrevWorker] = useState(worker)
  if (open !== prevOpen || worker !== prevWorker) {
    setPrevOpen(open)
    setPrevWorker(worker)
    if (open) {
      setFirstName(worker?.firstName ?? '')
      setFirstSurname(worker?.firstSurname ?? '')
      setSecondSurname(worker?.secondSurname ?? '')
      setEmail(worker?.email ?? '')
      setSections(worker?.allowedSections ?? {})
      setIsEnabled(worker?.isEnabled ?? true)
    }
  }

  const ownerDomain = emailDomain(ownerEmail)
  const candidateDomain = emailDomain(email)
  const showDomainWarning =
    isCreate && candidateDomain.length > 0 && ownerDomain.length > 0 && candidateDomain !== ownerDomain

  function setSectionLevel(href: WorkerSectionHref, level: 'none' | 'read' | 'write') {
    setSections((prev) => {
      const next = { ...prev }
      if (level === 'none') delete next[href]
      else next[href] = level
      return next
    })
  }

  function applyTemplate(key: (typeof WORKER_ROLE_TEMPLATE_KEYS)[number]) {
    setSections(WORKER_ROLE_TEMPLATES[key])
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)

    const result = isCreate
      ? await createWorkerAction({
          firstName: firstName.trim(),
          firstSurname: firstSurname.trim(),
          secondSurname: secondSurname.trim() || undefined,
          email: email.trim(),
          allowedSections: sections,
        })
      : await updateWorkerGrantAction({
          workerUserId: worker!.id,
          allowedSections: sections,
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
    <PortalSideDrawer open={open} onOpenChange={onOpenChange} size="wide">
      <div className="flex h-full min-h-0 flex-col">
        <DialogHeader className="shrink-0 border-b border-border px-6 py-4 pr-12 text-left dark:border-border/50">
          <DialogTitle className="font-sans text-lg font-semibold">
            {isCreate ? copy.createTitle : copy.editTitle}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {colaboradores.description}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-6">
          <form id={FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-7" noValidate>
            {isCreate ? (
              <div className="flex flex-col gap-3">
                <GroupHeading>{copy.personalDataLabel}</GroupHeading>
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <DrawerField id="worker-first-name" label={copy.firstName}>
                      <Input
                        id="worker-first-name"
                        required
                        value={firstName}
                        onChange={(event) => setFirstName(event.target.value)}
                        className={RECESSED_FIELD_CLASS}
                      />
                    </DrawerField>
                    <DrawerField id="worker-first-surname" label={copy.firstSurname}>
                      <Input
                        id="worker-first-surname"
                        required
                        value={firstSurname}
                        onChange={(event) => setFirstSurname(event.target.value)}
                        className={RECESSED_FIELD_CLASS}
                      />
                    </DrawerField>
                  </div>
                  <DrawerField id="worker-second-surname" label={copy.secondSurname}>
                    <Input
                      id="worker-second-surname"
                      value={secondSurname}
                      onChange={(event) => setSecondSurname(event.target.value)}
                      className={RECESSED_FIELD_CLASS}
                    />
                  </DrawerField>
                  <DrawerField id="worker-email" label={copy.email}>
                    <Input
                      id="worker-email"
                      type="email"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className={RECESSED_FIELD_CLASS}
                    />
                  </DrawerField>
                  {showDomainWarning ? (
                    <p className="text-sm text-amber-600 dark:text-amber-500" role="alert">
                      {copy.domainMismatch.replace('{domain}', ownerDomain)}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-3">
              <GroupHeading hint={copy.templatesHint}>{copy.templatesLabel}</GroupHeading>
              <div className="flex flex-wrap gap-1.5">
                {WORKER_ROLE_TEMPLATE_KEYS.map((key) => (
                  <Button
                    key={key}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyTemplate(key)}
                  >
                    {copy.templates[key]}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <GroupHeading>{copy.sectionsLabel}</GroupHeading>
              <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-muted/30 px-3 dark:divide-border/50 dark:border-border/50">
                {WORKER_SECTION_HREFS.map((href) => (
                  <div key={href} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="flex items-center gap-2.5 text-sm text-foreground">
                      <PortalNavIcon
                        icon={SECTION_ICON[href]}
                        className="size-4 shrink-0 text-muted-foreground"
                      />
                      {colaboradores.sections[href]}
                    </span>
                    <Select
                      value={sections[href] ?? 'none'}
                      onValueChange={(value) =>
                        setSectionLevel(href, value as 'none' | 'read' | 'write')
                      }
                    >
                      <SelectTrigger
                        className={SELECT_FIELD_CLASS}
                        aria-label={colaboradores.sections[href]}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{copy.levels.none}</SelectItem>
                        <SelectItem value="read">{copy.levels.read}</SelectItem>
                        {SECTIONS_WITH_WRITE.has(href) ? (
                          <SelectItem value="write">{copy.levels.write}</SelectItem>
                        ) : null}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            {!isCreate ? (
              <div className="flex flex-col gap-3">
                <GroupHeading>{copy.statusGroupLabel}</GroupHeading>
                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border px-4 py-3 dark:border-border/50">
                  <span className="text-sm text-foreground">{copy.isEnabledLabel}</span>
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={setIsEnabled}
                    aria-label={copy.isEnabledLabel}
                  />
                </label>
              </div>
            ) : null}
          </form>
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border bg-card px-6 py-4 sm:flex-row sm:justify-end dark:border-border/50">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            {copy.cancel}
          </Button>
          <Button type="submit" form={FORM_ID} disabled={pending} className="gap-2" aria-busy={pending}>
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
                {isCreate ? copy.creating : copy.saving}
              </>
            ) : isCreate ? (
              copy.create
            ) : (
              copy.save
            )}
          </Button>
        </div>
      </div>
    </PortalSideDrawer>
  )
}

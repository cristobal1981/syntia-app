'use client'

import type { ReactNode } from 'react'
import { ExternalLink, FileSignature } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { firmas } from '@/content/firmas'
import { cn } from '@/lib/utils'
import {
  formatSignatureDateCompact,
  isSignatureDueSoon,
} from '@/src/modules/firmas/domain/signature-due-date'
import type { PendingSignatureRequest } from '@/src/modules/firmas/domain/types'

type FirmasRequestsListProps = {
  requests: PendingSignatureRequest[]
  headerAction?: ReactNode
}

type FirmaDateFieldProps = {
  label: string
  value: string
  dateTime: string
  emphasis?: boolean
}

function FirmaDateField({
  label,
  value,
  dateTime,
  emphasis = false,
}: FirmaDateFieldProps) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-subtle-foreground">{label}</dt>
      <dd className="mt-0.5">
        <time
          dateTime={dateTime}
          className={cn(
            'block text-sm tabular-nums',
            emphasis ? 'font-medium text-destructive' : 'text-foreground'
          )}
        >
          {value}
        </time>
      </dd>
    </div>
  )
}

function FirmaStatusBadges({
  dueSoon,
  inline = false,
}: {
  dueSoon: boolean
  inline?: boolean
}) {
  const copy = firmas.list

  return (
    <div
      className={cn(
        'flex items-end gap-1.5',
        inline ? 'flex-row flex-wrap justify-end' : 'flex-col'
      )}
    >
      {dueSoon ? (
        <span className="badge-status-canceled inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap">
          {copy.dueSoon}
        </span>
      ) : null}
      <span className="badge-status-pending inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap">
        {copy.statusPending}
      </span>
    </div>
  )
}

function FirmasSignButton({ request }: { request: PendingSignatureRequest }) {
  const copy = firmas.list

  return (
    <Button
      asChild
      className={cn('min-h-10 w-full shrink-0 cursor-pointer gap-2 sm:w-auto')}
    >
      <a
        href={request.signUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${copy.signAction}: ${request.reference}`}
      >
        {firmas.signButton}
        <ExternalLink className="size-4 shrink-0" aria-hidden />
        <span className="sr-only"> (se abre en una pestaña nueva)</span>
      </a>
    </Button>
  )
}

function FirmasRequestItem({ request }: { request: PendingSignatureRequest }) {
  const copy = firmas.list
  const sentDate = formatSignatureDateCompact(request.createDate)
  const dueDate = formatSignatureDateCompact(request.dueDate)
  const dueSoon = isSignatureDueSoon(request.dueDate)
  const hasDates = Boolean(sentDate || dueDate)

  return (
    <li>
      <article className="portal-home-card rounded-xl p-4">
        <div className="grid grid-cols-[auto_1fr] grid-rows-[auto_auto_auto] gap-x-3 gap-y-2.5 sm:grid-cols-[auto_1fr_auto] sm:grid-rows-[auto_auto]">
          <div
            className={cn('self-start', hasDates ? 'row-span-2' : 'row-span-1')}
            aria-hidden
          >
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <FileSignature className="size-5 text-primary" />
            </div>
          </div>

          <div className="col-start-2 row-start-1 min-w-0">
            <div className="flex items-start justify-between gap-3 sm:block">
              <h3 className="min-w-0 font-sans text-base font-semibold leading-snug text-foreground">
                {request.reference}
              </h3>
              <div className="shrink-0 sm:hidden">
                <FirmaStatusBadges dueSoon={dueSoon} />
              </div>
            </div>
          </div>

          {hasDates ? (
            <dl className="col-start-2 row-start-2 grid max-w-sm grid-cols-2 gap-3 rounded-lg bg-muted/40 px-3 py-2.5 dark:bg-muted/25">
              {sentDate && request.createDate ? (
                <FirmaDateField
                  label={copy.sentLabel}
                  value={sentDate}
                  dateTime={request.createDate}
                />
              ) : null}
              {dueDate && request.dueDate ? (
                <FirmaDateField
                  label={copy.dueLabel}
                  value={dueDate}
                  dateTime={request.dueDate}
                  emphasis={dueSoon}
                />
              ) : null}
            </dl>
          ) : null}

          <div className="col-span-2 row-start-3 sm:hidden">
            <FirmasSignButton request={request} />
          </div>

          <div
            className={cn(
              'col-start-3 hidden flex-col items-end justify-between self-stretch sm:flex',
              hasDates ? 'row-span-2 row-start-1' : 'row-start-1'
            )}
          >
            <FirmaStatusBadges dueSoon={dueSoon} inline />
            <FirmasSignButton request={request} />
          </div>
        </div>
      </article>
    </li>
  )
}

function FirmasEmptyState() {
  return (
    <div className="portal-home-card flex flex-col items-center rounded-xl px-6 py-12 text-center md:px-8">
      <div
        className="flex size-12 items-center justify-center rounded-xl bg-muted/60 dark:bg-muted/40"
        aria-hidden
      >
        <FileSignature className="size-6 text-muted-foreground" />
      </div>
      <h3 className="mt-5 font-sans text-lg font-semibold text-foreground">
        {firmas.emptyTitle}
      </h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        {firmas.emptyDescription}
      </p>
      <p className="mt-3 max-w-lg text-sm leading-relaxed text-subtle-foreground">
        {firmas.emptyHint}
      </p>
    </div>
  )
}

export function FirmasRequestsList({
  requests,
  headerAction,
}: FirmasRequestsListProps) {
  const copy = firmas.list

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-sans text-2xl font-semibold text-foreground md:text-3xl">
            {copy.title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {copy.description}
          </p>
        </div>
        {headerAction}
      </header>

      {requests.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {requests.map((request) => (
            <FirmasRequestItem key={request.id} request={request} />
          ))}
        </ul>
      ) : (
        <FirmasEmptyState />
      )}
    </div>
  )
}

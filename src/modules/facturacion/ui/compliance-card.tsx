'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { CircleAlert, CircleCheck, Info } from 'lucide-react'

import { facturacion } from '@/content/facturacion'
import { isIssuerComplete } from '@/src/modules/facturacion/domain/issuer'
import { isLocked } from '@/src/modules/facturacion/domain/invoice-rules'
import { verifyNumbering, type NumberingIssue } from '@/src/modules/facturacion/domain/numbering'
import { useFacturacion } from '@/src/modules/facturacion/ui/facturacion-provider'

/** Los datos fiscales del emisor son los del perfil: ahí se completan. */
const PROFILE_HREF = '/perfil'

const copy = facturacion.compliance

function describeIssue(issue: NumberingIssue): string {
  if (issue.kind === 'gap') return copy.numberingIssue.gap(issue.series, issue.year, issue.missing)
  if (issue.kind === 'duplicate') return copy.numberingIssue.duplicate(issue.series, issue.year, issue.sequence)
  if (issue.kind === 'format') return copy.numberingIssue.format(issue.invoiceNumber)
  return copy.numberingIssue.chronology(issue.invoiceNumber)
}

function Check({ ok, children, action }: { ok: boolean; children: React.ReactNode; action?: React.ReactNode }) {
  const Icon = ok ? CircleCheck : CircleAlert
  return (
    <li className="flex items-start gap-2 text-sm">
      <Icon className={`mt-0.5 size-4 shrink-0 ${ok ? 'text-primary dark:text-primary' : 'text-destructive'}`} aria-hidden />
      <span className="min-w-0 flex-1 text-foreground">{children}</span>
      {action}
    </li>
  )
}

/** Panel con las comprobaciones automáticas de la normativa de facturación. */
export function ComplianceCard() {
  const { allInvoices, issuer } = useFacturacion()
  const numberingIssues = useMemo(() => verifyNumbering(allInvoices), [allInvoices])
  const locked = allInvoices.filter(isLocked).length
  const rectifications = allInvoices.filter((invoice) => invoice.kind === 'rectificativa' && invoice.status === 'definitiva').length
  const drafts = allInvoices.filter((invoice) => invoice.status === 'borrador').length
  const issuerOk = isIssuerComplete(issuer)

  const allGood = issuerOk && numberingIssues.length === 0 && drafts === 0

  const checks = (
    <ul className="mt-4 flex flex-col gap-2.5">
      <Check
        ok={issuerOk}
        action={
          !issuerOk ? (
            <Link href={PROFILE_HREF} className="shrink-0 text-sm font-medium text-foreground underline underline-offset-4">
              {copy.fix}
            </Link>
          ) : undefined
        }
      >
        {issuerOk ? copy.checks.issuer.ok : copy.checks.issuer.fail}
      </Check>
      <Check ok={numberingIssues.length === 0}>
        {numberingIssues.length === 0 ? copy.checks.numbering.ok : copy.checks.numbering.fail(numberingIssues.length)}
        {numberingIssues.length > 0 ? (
          <span className="mt-1 block text-xs text-muted-foreground">{numberingIssues.map(describeIssue).join(' · ')}</span>
        ) : null}
      </Check>
      <Check ok>{copy.checks.locked(locked)}</Check>
      <Check ok>{copy.checks.rectifications(rectifications)}</Check>
      <Check ok={drafts === 0}>{copy.checks.drafts(drafts)}</Check>
    </ul>
  )

  const notice = (
    <p className="mt-4 flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
      <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      {copy.notice}
    </p>
  )

  // Con todo en orden basta una línea; el detalle se despliega a petición. Si algo falla, se ve de entrada.
  return (
    <details className="portal-home-card rounded-xl p-4 sm:p-5" aria-label={copy.title} open={!allGood}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&::-webkit-details-marker]:hidden">
        <h2 className="font-sans text-base font-semibold text-foreground">{copy.title}</h2>
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          {allGood ? (
            <CircleCheck className="size-4 text-primary" aria-hidden />
          ) : (
            <CircleAlert className="size-4 text-destructive" aria-hidden />
          )}
          {allGood ? copy.allGood : copy.needsAttention}
        </span>
      </summary>
      <p className="mt-1 text-xs text-muted-foreground">{copy.description}</p>
      {checks}
      {notice}
    </details>
  )
}

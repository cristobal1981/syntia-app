import { Lock } from 'lucide-react'

import { facturacion } from '@/content/facturacion'
import { isLocked } from '@/src/modules/facturacion/domain/invoice-rules'
import { paymentStatus } from '@/src/modules/facturacion/domain/payment-status'
import type { Invoice } from '@/src/modules/facturacion/domain/types'

const PILL_TONE = { pagada: 'done', pendiente: 'pending', vencida: 'canceled' } as const

export function Pill({
  tone,
  children,
  icon,
}: {
  tone: 'done' | 'pending' | 'canceled' | 'neutral'
  children: React.ReactNode
  icon?: React.ReactNode
}) {
  const toneClass = tone === 'neutral' ? 'bg-muted text-muted-foreground' : `badge-status-${tone}`
  return (
    <span className={`${toneClass} inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap`}>
      {icon}
      {children}
    </span>
  )
}

export function PaymentPill({ invoice, today }: { invoice: Invoice; today: string }) {
  const status = paymentStatus(invoice, today)
  return <Pill tone={PILL_TONE[status]}>{facturacion.invoices.status[invoice.direction][status]}</Pill>
}

/** Estado de vida de la factura: borrador, expedida (con candado) o rectificativa. */
export function LifecyclePills({ invoice, rectified = false }: { invoice: Invoice; rectified?: boolean }) {
  const copy = facturacion.lifecycle

  if (invoice.direction === 'recibida') return <Pill tone="neutral">{copy.received}</Pill>
  if (invoice.status === 'borrador') return <Pill tone="pending">{copy.status.borrador}</Pill>

  return (
    <>
      <Pill tone="done" icon={isLocked(invoice) ? <Lock className="size-3" aria-hidden /> : undefined}>
        {copy.status.definitiva}
      </Pill>
      {invoice.kind === 'rectificativa' ? <Pill tone="neutral">{copy.kind.rectificativa}</Pill> : null}
      {rectified ? <Pill tone="canceled">{copy.rectified}</Pill> : null}
    </>
  )
}

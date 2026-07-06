'use client'

import { useState, useTransition } from 'react'
import { Receipt } from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'
import { activateFacturacionForClientAction } from '@/src/modules/facturacion/application/activate-facturacion-action'

type FacturacionActivationCardProps = {
  clientId: string
  odooCompanyId?: string
  onActivated?: () => void
}

/**
 * Estado y activación de la facturación VERI*FACTU de un cliente (advisor/admin).
 * Provisiona la res.company en Odoo por NIF y la vincula al cliente.
 */
export function FacturacionActivationCard({
  clientId,
  odooCompanyId,
  onActivated,
}: FacturacionActivationCardProps) {
  const [isPending, startTransition] = useTransition()
  const [activatedCompanyId, setActivatedCompanyId] = useState<string | null>(null)

  const effectiveCompanyId = activatedCompanyId ?? odooCompanyId
  const isActive = Boolean(effectiveCompanyId)

  const handleActivate = () => {
    startTransition(async () => {
      const result = await activateFacturacionForClientAction(clientId)
      if (!result.ok) {
        toast.error(
          result.message ??
            (result.error === 'validation'
              ? 'El cliente necesita NIF en su perfil.'
              : 'No se pudo activar la facturación. Inténtalo de nuevo.')
        )
        return
      }
      setActivatedCompanyId(String(result.data.companyId))
      toast.success(
        result.data.created
          ? 'Facturación VERI*FACTU activada: empresa creada en Odoo.'
          : 'Facturación VERI*FACTU activada: empresa existente vinculada.'
      )
      onActivated?.()
    })
  }

  return (
    <section
      className={cn(
        'rounded-lg border px-4 py-3',
        isActive ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border'
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Receipt className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <div>
            <p className="text-sm font-medium text-foreground">
              Facturación VERI*FACTU
            </p>
            <p className="text-xs text-muted-foreground">
              {isActive
                ? `Activada (empresa Odoo #${effectiveCompanyId}).`
                : 'Sin activar. Requiere NIF en el perfil del cliente.'}
            </p>
          </div>
        </div>
        {!isActive ? (
          <button
            type="button"
            onClick={handleActivate}
            disabled={isPending}
            className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity disabled:opacity-60"
          >
            {isPending ? 'Activando…' : 'Activar'}
          </button>
        ) : null}
      </div>
    </section>
  )
}

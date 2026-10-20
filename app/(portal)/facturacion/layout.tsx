import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'

import { getSession } from '@/src/modules/auth/application/get-session'
import { isInvoicingMockEnabled } from '@/src/modules/facturacion/domain/invoicing-availability'
import { FacturacionShell } from '@/src/modules/facturacion/ui/facturacion-shell'
import { PortalPageSkeletonBody } from '@/src/modules/portal/ui/skeletons'

/**
 * Mock local de facturación: en Vercel (develop, main o previews) ninguna de sus
 * rutas existe. La sesión es dato de request, así que se resuelve dentro de Suspense.
 */
export default function FacturacionLayout({ children }: { children: React.ReactNode }) {
  if (!isInvoicingMockEnabled()) notFound()

  return (
    <Suspense fallback={<PortalPageSkeletonBody />}>
      <FacturacionGate>{children}</FacturacionGate>
    </Suspense>
  )
}

async function FacturacionGate({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.user.role !== 'client') redirect('/dashboard')

  return <FacturacionShell>{children}</FacturacionShell>
}

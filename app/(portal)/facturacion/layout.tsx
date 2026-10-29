import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'

import { getSession } from '@/src/modules/auth/application/get-session'
import { isInvoicingMockEnabled } from '@/src/modules/facturacion/domain/invoicing-availability'
import { issuerFromProfile } from '@/src/modules/facturacion/domain/issuer-from-profile'
import { FacturacionShell } from '@/src/modules/facturacion/ui/facturacion-shell'
import { getClientProfileForClient } from '@/src/modules/profile/application/get-client-profile-for-client'
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

  // Los datos fiscales del emisor son los de su perfil de Odoo; si Odoo no responde, se sigue con el emisor del mock.
  const profile = await getClientProfileForClient(session.user)
  const odooIssuer = profile.ok ? issuerFromProfile(profile.profile) : null

  return <FacturacionShell odooIssuer={odooIssuer}>{children}</FacturacionShell>
}

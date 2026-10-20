import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'

import { getSession } from '@/src/modules/auth/application/get-session'
import { isInvoicingMockEnabled } from '@/src/modules/facturacion/domain/invoicing-availability'
import { FacturacionShell } from '@/src/modules/facturacion/ui/facturacion-shell'

/**
 * Mock local de facturación: en Vercel (develop, main o previews) ninguna de sus
 * rutas existe. La sesión es dato de request, así que se resuelve dentro de Suspense.
 */
export default function FacturacionLayout({ children }: { children: React.ReactNode }) {
  if (!isInvoicingMockEnabled()) notFound()

  // La página se renderiza en el marco estático: si colgara de la sesión dentro de
  // Suspense, la validación de navegación instantánea la descartaría. La puerta
  // solo redirige y no pinta nada.
  return (
    <FacturacionShell>
      <Suspense fallback={null}>
        <FacturacionGate />
      </Suspense>
      {children}
    </FacturacionShell>
  )
}

async function FacturacionGate() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.user.role !== 'client') redirect('/dashboard')

  return null
}

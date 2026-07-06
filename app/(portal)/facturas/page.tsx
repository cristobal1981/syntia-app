import { redirect } from 'next/navigation'

import { getSession } from '@/src/modules/auth/application/get-session'
import { FacturasPage } from '@/src/modules/facturacion/ui/facturas-page'

export default async function FacturasRoutePage() {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  if (session.user.role !== 'client') {
    redirect('/dashboard')
  }

  return <FacturasPage />
}

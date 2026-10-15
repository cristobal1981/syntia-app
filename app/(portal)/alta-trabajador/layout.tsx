import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'

import { getSession } from '@/src/modules/auth/application/get-session'
import { assertSectionAccess } from '@/src/modules/colaboradores/application/assert-section-access'
import { AltaTrabajadorLayoutClient } from '@/src/modules/alta-trabajador/ui/alta-trabajador-layout-client'
import { isProcedureTypeAvailable } from '@/src/modules/tramites/domain/procedure-ticket-types'

/**
 * Alta de trabajador desactivada a propósito (ver `isProcedureTypeAvailable`):
 * mientras lo esté, toda la ruta y sus pasos responden 404 en vez de mostrar
 * el wizard. El módulo `alta-trabajador` se conserva para reactivarlo.
 */
export default function AltaTrabajadorLayout({ children }: { children: React.ReactNode }) {
  if (!isProcedureTypeAvailable('alta-trabajador')) {
    notFound()
  }

  return (
    <Suspense fallback={null}>
      <AltaTrabajadorAccessGate>{children}</AltaTrabajadorAccessGate>
    </Suspense>
  )
}

async function AltaTrabajadorAccessGate({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  await assertSectionAccess(session, '/tramites')

  return (
    <div className="flex flex-1 flex-col py-6 md:py-8">
      <div className="container px-4 md:px-6">
        <AltaTrabajadorLayoutClient>{children}</AltaTrabajadorLayoutClient>
      </div>
    </div>
  )
}

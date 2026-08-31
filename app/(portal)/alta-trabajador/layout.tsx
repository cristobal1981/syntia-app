import { redirect } from 'next/navigation'

import { getSession } from '@/src/modules/auth/application/get-session'
import { assertSectionAccess } from '@/src/modules/colaboradores/application/assert-section-access'
import { AltaTrabajadorLayoutClient } from '@/src/modules/alta-trabajador/ui/alta-trabajador-layout-client'

export default async function AltaTrabajadorLayout({
  children,
}: {
  children: React.ReactNode
}) {
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

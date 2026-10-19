import { Suspense } from 'react'

import { EditPartySection } from '@/src/modules/facturacion/ui/section-views'

export default function FacturacionTerceroPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={null}>
      <Body params={params} />
    </Suspense>
  )
}

async function Body({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <EditPartySection partyId={id} />
}

import { Suspense } from 'react'

import { RectifyInvoiceSection } from '@/src/modules/facturacion/ui/section-views'

export default function FacturacionRectificarFacturaPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={null}>
      <Body params={params} />
    </Suspense>
  )
}

async function Body({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <RectifyInvoiceSection invoiceId={id} />
}

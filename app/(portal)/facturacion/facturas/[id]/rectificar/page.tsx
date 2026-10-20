import { Suspense } from 'react'

import { RectifyInvoiceSection } from '@/src/modules/facturacion/ui/section-views'

// Mock local: la validación de navegación instantánea descarta este segmento (ver «Histórico de Errores» en Notion).
export const instant = false

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

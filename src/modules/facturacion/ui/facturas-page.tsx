import { facturas } from '@/content/facturas'
import { getFacturasAction } from '@/src/modules/facturacion/application/facturacion-actions'
import {
  FacturasPageView,
  FacturasStateView,
} from '@/src/modules/facturacion/ui/facturas-page-view'

export async function FacturasPage() {
  const result = await getFacturasAction({})

  if (!result.ok) {
    const stateCopy = facturas.states
    if (result.error === 'not_linked') {
      return (
        <FacturasStateView
          title={stateCopy.notLinked.title}
          description={stateCopy.notLinked.description}
        />
      )
    }
    if (result.error === 'odoo_rate_limited') {
      return (
        <FacturasStateView
          title={stateCopy.odooRateLimited.title}
          description={stateCopy.odooRateLimited.description}
          variant="destructive"
        />
      )
    }
    if (result.error === 'forbidden' || result.error === 'unauthorized') {
      return (
        <FacturasStateView
          title={stateCopy.forbidden.title}
          description={stateCopy.forbidden.description}
          variant="destructive"
        />
      )
    }
    return (
      <FacturasStateView
        title={stateCopy.odooUnavailable.title}
        description={stateCopy.odooUnavailable.description}
        variant="destructive"
      />
    )
  }

  return <FacturasPageView invoices={result.data} />
}

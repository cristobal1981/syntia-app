'use client'

import { useState, type FormEvent } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { facturacion } from '@/content/facturacion'
import { centsToInput } from '@/src/modules/facturacion/domain/invoice-form'
import { removeProduct, saveProduct } from '@/src/modules/facturacion/domain/invoicing-state'
import { formatCents, parseAmountToCents } from '@/src/modules/facturacion/domain/money'
import type { Product } from '@/src/modules/facturacion/domain/products'
import { runInvoicingOperation } from '@/src/modules/facturacion/infrastructure/local-invoice-store'
import { BookTable } from '@/src/modules/facturacion/ui/book-table'
import { useFacturacion } from '@/src/modules/facturacion/ui/facturacion-provider'
import { PortalConfirmDialog } from '@/src/modules/portal/ui/portal-confirm-dialog'
import { TramiteDrawerField } from '@/src/modules/tramites/ui/tramite-drawer-field'

const copy = facturacion.products

type Editing = { id: string | null; name: string; price: string }

export function ProductsTab() {
  const { products } = useFacturacion()
  const [editing, setEditing] = useState<Editing | null>(null)
  const [errors, setErrors] = useState<Partial<Record<'name' | 'price', string>>>({})
  const [toDelete, setToDelete] = useState<Product | null>(null)

  const rows = [...products].sort((a, b) => a.name.localeCompare(b.name))

  const close = () => {
    setEditing(null)
    setErrors({})
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editing) return
    const product: Product = {
      id: editing.id ?? `producto-${Date.now().toString(36)}`,
      name: editing.name,
      priceCents: parseAmountToCents(editing.price) ?? 0,
    }
    const result = runInvoicingOperation((state, context) => saveProduct(state, product, context))
    if (!result.ok) {
      setErrors({
        name: result.errors.name ? copy.errors[result.errors.name] : undefined,
        price: result.errors.priceCents ? copy.errors[result.errors.priceCents] : undefined,
      })
      return
    }
    toast.success(copy.saved)
    close()
  }

  const handleDelete = () => {
    if (!toDelete) return
    runInvoicingOperation((state, context) => ({ ok: true as const, state: removeProduct(state, toDelete.id, context) }))
    toast.success(copy.deleted)
    setToDelete(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="max-w-3xl text-sm text-muted-foreground">{copy.description}</p>
      {editing ? (
        <form
          className="flex max-w-xl flex-col gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3 dark:border-border/60"
          onSubmit={handleSubmit}
          noValidate
          aria-label={editing.id ? copy.editTitle : copy.newTitle}
        >
          <p className="text-sm font-medium text-foreground">{editing.id ? copy.editTitle : copy.newTitle}</p>
          <TramiteDrawerField
            id="product-name"
            name="name"
            label={copy.fields.name}
            value={editing.name}
            error={errors.name}
            required
            onChange={(name) => setEditing({ ...editing, name })}
          />
          <TramiteDrawerField
            id="product-price"
            name="price"
            label={copy.fields.price}
            value={editing.price}
            error={errors.price}
            required
            onChange={(price) => setEditing({ ...editing, price })}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={close}>
              {copy.cancel}
            </Button>
            <Button type="submit">{copy.save}</Button>
          </div>
        </form>
      ) : (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setEditing({ id: null, name: '', price: '' })}>
            <Plus aria-hidden />
            {copy.newButton}
          </Button>
        </div>
      )}
      <BookTable
        caption={facturacion.tabs.products}
        emptyMessage={copy.empty}
        columns={[
          { key: 'name', label: copy.columns.name },
          { key: 'price', label: copy.columns.price, align: 'right' },
          { key: 'actions', label: '', align: 'right' },
        ]}
        rows={rows.map((product) => ({
          key: product.id,
          cells: [
            product.name,
            formatCents(product.priceCents),
            <span key="a" className="inline-flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`${copy.edit}: ${product.name}`}
                onClick={() => setEditing({ id: product.id, name: product.name, price: centsToInput(product.priceCents) })}
              >
                <Pencil aria-hidden />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`${copy.delete}: ${product.name}`}
                onClick={() => setToDelete(product)}
              >
                <Trash2 aria-hidden />
              </Button>
            </span>,
          ],
        }))}
      />
      <PortalConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={copy.deleteTitle}
        description={copy.deleteBody}
        confirmLabel={copy.delete}
        confirmVariant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}

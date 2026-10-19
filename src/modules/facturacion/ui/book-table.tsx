'use client'

import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'

import { cn } from '@/lib/utils'

type BookColumn = {
  key: string
  label: string
  align?: 'left' | 'right'
}

type BookTableProps = {
  caption: string
  columns: BookColumn[]
  /** Con `href`, toda la fila lleva a esa ruta (los enlaces y botones de dentro siguen funcionando). */
  rows: Array<{ key: string; cells: ReactNode[]; href?: string }>
  footer?: ReactNode[]
  emptyMessage: string
}

/** Tabla contable: cifras alineadas a la derecha, con fila de totales opcional. */
export function BookTable({ caption, columns, rows, footer, emptyMessage }: BookTableProps) {
  const router = useRouter()
  if (rows.length === 0) {
    return (
      <p className="portal-home-card rounded-xl px-4 py-8 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    )
  }

  const alignClass = (align?: 'left' | 'right') => (align === 'right' ? 'text-right tabular-nums' : 'text-left')

  return (
    <div className="portal-home-card overflow-x-auto rounded-xl">
      <table className="w-full min-w-[640px] text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-border dark:border-border/50">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn('px-4 py-3 font-sans font-medium text-muted-foreground', alignClass(column.align))}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.key}
              className={cn(
                'border-b border-border last:border-b-0 dark:border-border/50',
                row.href && 'cursor-pointer hover:bg-muted/50'
              )}
              onClick={
                row.href
                  ? (event) => {
                      if ((event.target as HTMLElement).closest('a,button,input,select,label')) return
                      router.push(row.href as string)
                    }
                  : undefined
              }
            >
              {row.cells.map((cell, index) => (
                <td key={index} className={cn('px-4 py-2.5 text-foreground', alignClass(columns[index]?.align))}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {footer ? (
          <tfoot>
            <tr className="border-t border-border bg-muted/40 font-medium dark:border-border/60">
              {footer.map((cell, index) => (
                <td key={index} className={cn('px-4 py-3 text-foreground', alignClass(columns[index]?.align))}>
                  {cell}
                </td>
              ))}
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  )
}

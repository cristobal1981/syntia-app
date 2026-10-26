import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

export const marketingCtaBaseClassName =
  'font-semibold transition-[transform,background-color,border-color,color] duration-250 ease-out motion-reduce:transform-none motion-reduce:transition-none hover:-translate-y-px active:translate-y-0 active:scale-[0.995] focus-visible:ring-[3px]'

export const marketingCtaVariantClassName = {
  primary: 'hover:bg-primary/90',
  secondary:
    'border-on-dark/40 bg-on-dark/5 text-on-dark hover:border-primary/70 hover:bg-primary/14 hover:text-on-dark',
  brisa: 'bg-secondary text-brisa hover:bg-secondary/88',
} as const

/**
 * Sistema cerrado de botones de la app. Cada variante tiene un propósito; no se inventan estilos ad hoc.
 *
 * - `default`      Primario: relleno sólido Verde Syntia. La acción principal de la pantalla (una por vista).
 * - `outline`      Secundario: blanco con borde. Acciones de apoyo junto al primario.
 * - `ghost`        Terciario: sin fondo. Acciones discretas, cerrar, iconos.
 * - `destructive`  Acción destructiva.
 * - `link`         Enlace en línea.
 * - `nav`          Acción global de navegación sobre el chrome oscuro (barra superior y lateral).
 * - `filter` / `filterActive`  Chips de filtro: blanco en reposo y agua/turquesa al activarse.
 */
const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40',
        outline:
          'border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-muted dark:border-border dark:text-foreground dark:hover:bg-input dark:hover:text-foreground',
        ghost:
          'hover:bg-accent hover:text-accent-foreground dark:hover:bg-muted dark:hover:text-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        nav: 'nav-action focus-visible:ring-sidebar-ring/50',
        filter:
          'border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:border-border/70 dark:bg-background dark:text-muted-foreground dark:shadow-none dark:hover:border-border dark:hover:bg-muted/70 dark:hover:text-foreground',
        filterActive:
          'bg-secondary text-secondary-foreground hover:bg-secondary/90 dark:border dark:border-primary/55 dark:bg-primary/28 dark:text-primary dark:shadow-none dark:hover:bg-primary/35',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5',
        lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
        icon: 'size-9',
        'icon-sm': 'size-8',
        'icon-lg': 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { Button, buttonVariants }

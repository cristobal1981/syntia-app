import * as React from 'react'
import {
  Button,
  marketingCtaBaseClassName,
  marketingCtaVariantClassName,
} from '@/components/ui/button'
import { cn } from '@/lib/utils'

type MarketingButtonProps = React.ComponentProps<typeof Button> & {
  marketingVariant?: keyof typeof marketingCtaVariantClassName
}

export function MarketingButton({
  className,
  marketingVariant = 'primary',
  ...props
}: MarketingButtonProps) {
  return (
    <Button
      className={cn(
        marketingCtaBaseClassName,
        marketingCtaVariantClassName[marketingVariant],
        className
      )}
      {...props}
    />
  )
}

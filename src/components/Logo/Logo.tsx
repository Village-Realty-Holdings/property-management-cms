import React from 'react'

import { cn } from '@/lib/ui'

type Props = {
  /** Site name from the tenant's header. */
  brand?: string | null
  className?: string
}

/** The wordmark used in the header and footer. */
export const Logo: React.FC<Props> = ({ brand, className }) => (
  <span className={cn('font-heading text-xl font-semibold tracking-tight', className)}>
    {brand || 'Home'}
  </span>
)

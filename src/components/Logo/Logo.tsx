import React from 'react'

import type { Media as MediaType } from '@/payload-types'

import { Media } from '@/components/Media'
import { cn } from '@/lib/ui'

type Props = {
  /** Site name from the tenant's header. */
  brand?: string | null
  /** Wordmark from the tenant's header; shown instead of the name when set. */
  logo?: MediaType | number | null
  className?: string
}

/** The wordmark used in the header and footer. */
export const Logo: React.FC<Props> = ({ brand, logo, className }) => {
  if (logo && typeof logo === 'object') {
    return (
      <Media
        resource={logo}
        alt={brand || logo.alt || ''}
        htmlElement={null}
        priority
        imgClassName={cn('h-9 w-auto max-w-[14rem] object-contain md:h-10', className)}
      />
    )
  }
  return (
    <span className={cn('font-heading text-xl font-semibold tracking-tight', className)}>
      {brand || 'Home'}
    </span>
  )
}

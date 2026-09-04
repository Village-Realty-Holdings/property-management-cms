import React from 'react'
import { Star } from 'lucide-react'

import { cn } from '@/lib/ui'

type Props = {
  value: number
  className?: string
  size?: 'sm' | 'md'
}

/** Five stars, the first `value` filled. */
export const Stars: React.FC<Props> = ({ value, className, size = 'sm' }) => (
  <span
    role="img"
    aria-label={`${value} out of 5 stars`}
    className={cn('inline-flex items-center gap-0.5 text-warning', className)}
  >
    {Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        aria-hidden="true"
        className={cn(
          size === 'sm' ? 'size-3.5' : 'size-4',
          i < value ? 'fill-current' : 'text-border',
        )}
      />
    ))}
  </span>
)

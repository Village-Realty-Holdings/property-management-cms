import * as React from 'react'
import { ChevronDownIcon } from 'lucide-react'

import { cn } from '@/lib/ui'

/**
 * A styled native `<select>`. Used in forms that submit as plain GET requests,
 * where the popup Select would need JavaScript to carry a value.
 */
function NativeSelect({ className, children, ...props }: React.ComponentProps<'select'>) {
  return (
    <span className={cn('relative block', className)}>
      <select
        data-slot="native-select"
        className="h-10 w-full appearance-none rounded-md border border-input bg-background pr-9 pl-3 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
        {...props}
      >
        {children}
      </select>
      <ChevronDownIcon
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </span>
  )
}

export { NativeSelect }

import type { ReactNode } from "react"
import { CircleAlertIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

/**
 * A failure shown where it happened (next to the form or dialog that failed).
 * Successes are toasts (see `notify`); failures are never toast-only, because
 * a toast disappears before the user has read how to fix the problem.
 *
 * `role="alert"` makes screen readers announce it as soon as it appears.
 */
export function InlineError({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      role="alert"
      data-slot="inline-error"
      className={cn(
        "flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive",
        className
      )}
    >
      <CircleAlertIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  )
}

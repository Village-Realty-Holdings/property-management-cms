import type { ReactNode } from "react"

import { cn } from "@workspace/ui/lib/utils"

/** A titled card on the Dashboard. The title is its accessible name. */
export function DashboardCard({
  id,
  title,
  action,
  children,
  className,
}: {
  id: string
  title: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section
      aria-labelledby={id}
      className={cn(
        "flex flex-col gap-3 rounded-xl border bg-background p-5",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id={id} className="text-base font-semibold">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

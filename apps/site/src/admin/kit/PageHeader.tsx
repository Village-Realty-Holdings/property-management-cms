import type { ReactNode } from "react"

import { cn } from "@workspace/ui/lib/utils"

/**
 * The one page-header pattern for every Admin screen: the title (the page's
 * only h1), a one-line description, and the primary action on the right. On
 * narrow screens the action drops below the text.
 *
 *   <PageHeader
 *     title="Pages"
 *     description="Everything visitors can open on your Site."
 *     action={<Button render={<Link href="/admin/pages/new" />}>New Page</Button>}
 *   />
 */
export function PageHeader({
  title,
  description,
  action,
  className,
}: {
  title: string
  /** One line: what this screen is for. */
  description: string
  /** The screen's primary action (at most one), shown on the right. */
  action?: ReactNode
  className?: string
}) {
  return (
    <header
      data-slot="page-header"
      className={cn(
        "mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        className
      )}
    >
      <div className="min-w-0">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {action && (
        <div className="flex shrink-0 items-center gap-2">{action}</div>
      )}
    </header>
  )
}

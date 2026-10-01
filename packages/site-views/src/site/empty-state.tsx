import type { ReactNode } from "react"
import { SearchXIcon, type LucideIcon } from "lucide-react"

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import { cn } from "@workspace/ui/lib/utils"

export type EmptyStateProps = {
  title: string
  /** What to do next, in a sentence. */
  description?: ReactNode
  /** A link or button that gets the guest moving again. */
  action?: ReactNode
  icon?: LucideIcon
  className?: string
}

/** Nothing to show (no results, an empty list), and what to do instead. */
export function EmptyState({
  title,
  description,
  action,
  icon: Icon = SearchXIcon,
  className,
}: EmptyStateProps) {
  return (
    <Empty className={cn("border border-border bg-card py-12", className)}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon aria-hidden />
        </EmptyMedia>
        <EmptyTitle className="text-base">{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  )
}

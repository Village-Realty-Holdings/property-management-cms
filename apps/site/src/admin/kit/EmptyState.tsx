import type { ReactNode } from "react"

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import { cn } from "@workspace/ui/lib/utils"

/**
 * What a list or panel shows when it has nothing to show. It always offers the
 * primary action, so the user is never left at a dead end.
 *
 *   <EmptyState
 *     icon={<FileTextIcon />}
 *     title="No Pages yet"
 *     description="Create your first Page to get started."
 *     action={<Button render={<Link href="/admin/pages/new" />}>New Page</Button>}
 *   />
 *
 * For "nothing matches your search", pass a "Clear search" action instead.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode
  title: string
  description: string
  /** The primary action for this list, e.g. the button that creates the first item. */
  action: ReactNode
  className?: string
}) {
  return (
    <Empty className={cn("border py-10", className)}>
      <EmptyHeader>
        {icon && <EmptyMedia variant="icon">{icon}</EmptyMedia>}
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>{action}</EmptyContent>
    </Empty>
  )
}

import { Badge } from "@workspace/ui/components/badge"

import { pageStatusLabel, type PageStatus } from "./pageStatus"

const variants = {
  draft: "secondary",
  published: "default",
  changes: "outline",
} as const

/** A Page's status as a chip: Draft, Published or Changes not published. */
export function StatusChip({ status }: { status: PageStatus }) {
  return (
    <Badge variant={variants[status]} data-status={status}>
      {pageStatusLabel(status)}
    </Badge>
  )
}

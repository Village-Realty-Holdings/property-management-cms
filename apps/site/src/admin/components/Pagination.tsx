import Link from "next/link"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

/** A page number from a `?page=` value: the first value, a whole number of at least 1, else 1. */
export function pageParam(value: string | string[] | undefined): number {
  const first = Array.isArray(value) ? value[0] : value
  if (first === undefined || first.trim() === "") return 1
  const n = Number(first)
  return Number.isInteger(n) && n >= 1 ? n : 1
}

const disabled = cn(
  buttonVariants({ variant: "outline" }),
  "pointer-events-none opacity-50"
)

/** Previous and Next links with the current page; nothing when there is one page. */
export function Pagination({
  page,
  totalPages,
  href,
}: {
  page: number
  totalPages: number
  /** The URL of a given page. */
  href: (page: number) => string
}) {
  if (totalPages <= 1) return null
  return (
    <nav
      aria-label="Pagination"
      className="mt-6 flex items-center justify-between gap-2"
    >
      {page > 1 ? (
        <Link
          href={href(page - 1)}
          className={buttonVariants({ variant: "outline" })}
        >
          <ChevronLeftIcon aria-hidden="true" /> Previous
        </Link>
      ) : (
        <span aria-disabled="true" className={disabled}>
          <ChevronLeftIcon aria-hidden="true" /> Previous
        </span>
      )}
      <span className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </span>
      {page < totalPages ? (
        <Link
          href={href(page + 1)}
          className={buttonVariants({ variant: "outline" })}
        >
          Next <ChevronRightIcon aria-hidden="true" />
        </Link>
      ) : (
        <span aria-disabled="true" className={disabled}>
          Next <ChevronRightIcon aria-hidden="true" />
        </span>
      )}
    </nav>
  )
}

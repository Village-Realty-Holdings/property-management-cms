import Link from "next/link"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

import {
  browseHref,
  type BrowseParams,
} from "@workspace/site-views/browse/params"

/** Page numbers to show: first, last, and two either side of the current. */
export function pageWindow(current: number, total: number): (number | null)[] {
  const pages = new Set([1, total])
  for (let p = current - 1; p <= current + 1; p++) {
    if (p >= 1 && p <= total) pages.add(p)
  }
  const sorted = [...pages].sort((a, b) => a - b)
  const out: (number | null)[] = []
  sorted.forEach((page, i) => {
    const prev = sorted[i - 1]
    if (prev !== undefined && page - prev > 1) out.push(null)
    out.push(page)
  })
  return out
}

const itemClass =
  "inline-flex h-10 min-w-10 items-center justify-center gap-1 rounded-full px-3 text-sm font-medium tabular-nums transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"

/** Links to other result pages; keeps every filter and the sort. */
export function BrowsePagination({
  params,
  totalPages,
}: {
  params: BrowseParams
  totalPages: number
}) {
  if (totalPages <= 1) return null
  const current = Math.min(params.page, totalPages)
  const href = (page: number) => browseHref({ ...params, page })

  return (
    <nav aria-label="Result pages" className="flex justify-center">
      <ul className="flex flex-wrap items-center gap-1">
        <li>
          {current > 1 ? (
            <Link
              href={href(current - 1)}
              className={cn(itemClass, "hover:bg-muted")}
            >
              <ChevronLeftIcon aria-hidden className="size-4" />
              Previous
            </Link>
          ) : (
            <span aria-disabled className={cn(itemClass, "opacity-40")}>
              <ChevronLeftIcon aria-hidden className="size-4" />
              Previous
            </span>
          )}
        </li>
        {pageWindow(current, totalPages).map((page, i) =>
          page === null ? (
            <li
              key={`gap-${i}`}
              aria-hidden
              className="hidden px-1 text-muted-foreground sm:block"
            >
              …
            </li>
          ) : (
            <li key={page} className="hidden sm:block">
              <Link
                href={href(page)}
                aria-current={page === current ? "page" : undefined}
                aria-label={`Page ${page}`}
                className={cn(
                  itemClass,
                  page === current
                    ? "bg-(--brand-primary) text-(--brand-primary-foreground)"
                    : "hover:bg-muted"
                )}
              >
                {page}
              </Link>
            </li>
          )
        )}
        <li className="px-2 text-sm text-muted-foreground sm:hidden">
          Page {current} of {totalPages}
        </li>
        <li>
          {current < totalPages ? (
            <Link
              href={href(current + 1)}
              className={cn(itemClass, "hover:bg-muted")}
            >
              Next
              <ChevronRightIcon aria-hidden className="size-4" />
            </Link>
          ) : (
            <span aria-disabled className={cn(itemClass, "opacity-40")}>
              Next
              <ChevronRightIcon aria-hidden className="size-4" />
            </span>
          )}
        </li>
      </ul>
    </nav>
  )
}

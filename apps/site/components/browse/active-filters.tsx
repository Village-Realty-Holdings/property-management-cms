import Link from "next/link"
import { XIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

import type { ActiveFilter } from "@workspace/site-views/browse/options"

/**
 * The filters in force, each removable with one click, plus "Clear all".
 * Plain links, so they work before the page's JavaScript loads.
 */
export function ActiveFilters({
  filters,
  clearHref,
}: {
  filters: ActiveFilter[]
  clearHref: string
}) {
  if (filters.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-2">
      <h2 className="sr-only">Active filters</h2>
      <ul className="contents">
        {filters.map((filter) => (
          <li key={filter.id}>
            <Link
              href={filter.removeHref}
              scroll={false}
              replace
              className={cn(
                "group inline-flex min-h-8 items-center gap-1.5 rounded-full border py-1 pr-2 pl-3 text-sm transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                filter.unknown
                  ? "border-destructive/40 bg-destructive/5 text-destructive hover:bg-destructive/10"
                  : "border-(--brand-primary)/25 bg-(--brand-primary)/8 hover:border-(--brand-primary)/60"
              )}
            >
              <span className="sr-only">Remove filter: </span>
              {filter.label}
              <XIcon
                aria-hidden
                className="size-3.5 opacity-60 group-hover:opacity-100"
              />
            </Link>
          </li>
        ))}
      </ul>
      {filters.length > 1 && (
        <Link
          href={clearHref}
          scroll={false}
          replace
          className="ml-1 rounded-sm text-sm font-medium underline decoration-(--brand-accent) decoration-2 underline-offset-4 hover:decoration-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          Clear all
        </Link>
      )}
    </div>
  )
}

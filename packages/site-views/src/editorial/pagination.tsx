import Link from "next/link"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

export type PaginationProps = {
  /** The index path, e.g. "/guides". Page 1 is the bare path. */
  basePath: string
  page: number
  totalPages: number
  /** Link text, e.g. "Newer guides" / "Older guides". */
  previousLabel?: string
  nextLabel?: string
}

export const pageHref = (basePath: string, page: number) =>
  page <= 1 ? basePath : `${basePath}?page=${page}`

/** Previous / next links with "Page 2 of 5" between. Nothing for one page. */
export function Pagination({
  basePath,
  page,
  totalPages,
  previousLabel = "Previous",
  nextLabel = "Next",
}: PaginationProps) {
  if (totalPages <= 1) return null
  const link = cn(buttonVariants({ variant: "outline", size: "lg" }), "px-4")
  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between gap-4 border-t border-border pt-8"
    >
      <div className="flex-1">
        {page > 1 && (
          <Link
            href={pageHref(basePath, Math.min(page - 1, totalPages))}
            className={link}
            rel="prev"
          >
            <ChevronLeftIcon data-icon="inline-start" aria-hidden />
            {previousLabel}
          </Link>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </p>
      <div className="flex flex-1 justify-end">
        {page < totalPages && (
          <Link href={pageHref(basePath, page + 1)} className={link} rel="next">
            {nextLabel}
            <ChevronRightIcon data-icon="inline-end" aria-hidden />
          </Link>
        )}
      </div>
    </nav>
  )
}

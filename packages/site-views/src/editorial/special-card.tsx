import Link from "next/link"
import { CalendarIcon } from "lucide-react"

import type { SpecialDoc } from "@workspace/content/queries"
import { cn } from "@workspace/ui/lib/utils"

import { displayFont } from "../site/display"

import { formatValidity } from "./format"

export const specialHref = (special: Pick<SpecialDoc, "slug">) =>
  `/specials/${special.slug}`

export type SpecialCardProps = {
  special: SpecialDoc
  headingAs?: "h2" | "h3"
  className?: string
}

/**
 * A Special in the index, drawn as a ticket: the offer on the left, the code
 * on a perforated stub. The whole ticket links to the Special's page.
 */
export function SpecialCard({
  special,
  headingAs: Heading = "h2",
  className,
}: SpecialCardProps) {
  const validity = formatValidity(special.validFrom, special.validTo)
  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground transition-colors hover:border-(--brand-primary)/40 sm:flex-row",
        className
      )}
    >
      <div className="flex flex-1 flex-col gap-3 p-6 sm:p-8">
        <Heading
          className={cn(
            displayFont,
            "text-2xl leading-tight text-balance sm:text-3xl"
          )}
        >
          <Link
            href={specialHref(special)}
            className="decoration-(--brand-accent) decoration-2 underline-offset-4 outline-none group-hover:underline after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-3 focus-visible:after:ring-ring/60"
          >
            {special.title}
          </Link>
        </Heading>
        {special.description && (
          <p className="max-w-prose text-base text-pretty text-muted-foreground">
            {special.description}
          </p>
        )}
        {validity && (
          <p className="mt-auto flex items-center gap-2 pt-2 text-sm font-medium">
            <CalendarIcon
              aria-hidden
              className="size-4 text-(--brand-primary)"
            />
            {validity}
          </p>
        )}
      </div>
      {special.code && (
        <div className="relative flex items-center justify-between gap-4 border-t-2 border-dashed border-border bg-(--brand-primary) px-6 py-5 text-(--brand-primary-foreground) sm:w-64 sm:flex-col sm:items-start sm:justify-center sm:border-t-0 sm:border-l-2 sm:px-8">
          <span className="text-sm opacity-80">Use code</span>
          <span
            className={cn(displayFont, "text-2xl tracking-wide wrap-anywhere")}
          >
            {special.code}
          </span>
        </div>
      )}
    </article>
  )
}

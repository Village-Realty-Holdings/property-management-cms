import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"

import type { LocationRef } from "@workspace/content"
import { cn } from "@workspace/ui/lib/utils"

import { displayFont } from "@workspace/site-views/site/display"

import { levelName, locationHref } from "./location-links"

export type ChildLocationsProps = {
  locations: LocationRef[]
  /** Heading level of each Location's name. @default "h3" */
  headingAs?: "h2" | "h3"
  className?: string
}

/**
 * Locations to go deeper into, as a ruled list of links: the name in the
 * display face with its Level beside it. Each row links to its page.
 */
export function ChildLocations({
  locations,
  headingAs: Heading = "h3",
  className,
}: ChildLocationsProps) {
  if (locations.length === 0) return null
  return (
    <ul className={cn("flex flex-col border-t border-border", className)}>
      {locations.map((location) => {
        const level = levelName(location.level)
        return (
          <li
            key={location.id}
            className="group relative flex items-center gap-4 border-b border-border py-4"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <Heading
                className={cn(
                  displayFont,
                  "text-2xl leading-tight text-balance"
                )}
              >
                <Link
                  href={locationHref(location)}
                  className="decoration-(--brand-accent) decoration-2 underline-offset-4 outline-none group-hover:underline after:absolute after:inset-0 after:rounded-md focus-visible:after:ring-3 focus-visible:after:ring-ring/60"
                >
                  {location.name}
                </Link>
              </Heading>
              {level && (
                <p className="text-sm text-muted-foreground">{level}</p>
              )}
            </div>
            <ArrowRightIcon
              aria-hidden
              className="size-5 shrink-0 text-(--brand-primary) transition-transform group-hover:translate-x-1 motion-reduce:transition-none"
            />
          </li>
        )
      })}
    </ul>
  )
}

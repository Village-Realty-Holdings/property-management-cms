import type { ReactNode } from "react"

import type { PropertySummary } from "@workspace/content/queries"
import { cn } from "@workspace/ui/lib/utils"

import { EmptyState } from "./empty-state"
import { PropertyCard } from "./property-card"

export type PropertyGridProps = {
  properties: PropertySummary[]
  /** How many leading photos to preload (above the fold). @default 0 */
  preloadCount?: number
  /** Heading level of each card's name. @default "h3" */
  cardHeadingAs?: "h2" | "h3" | "h4"
  /** Shown instead of the grid when there are no Properties. */
  empty?: { title: string; description?: ReactNode; action?: ReactNode }
  className?: string
}

/**
 * Properties in a responsive grid: one column on phones, two on tablets,
 * three on desktops. Renders an EmptyState when the list is empty.
 */
export function PropertyGrid({
  properties,
  preloadCount = 0,
  cardHeadingAs,
  empty = {
    title: "No rentals match",
    description: "Try a different place or fewer filters.",
  },
  className,
}: PropertyGridProps) {
  if (properties.length === 0) return <EmptyState {...empty} />
  return (
    <ul
      className={cn(
        "grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3",
        className
      )}
    >
      {properties.map((property, i) => (
        <li key={property.id}>
          <PropertyCard
            property={property}
            preload={i < preloadCount}
            headingAs={cardHeadingAs}
          />
        </li>
      ))}
    </ul>
  )
}

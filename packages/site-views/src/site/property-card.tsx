import Link from "next/link"
import {
  BathIcon,
  BedDoubleIcon,
  PawPrintIcon,
  StarIcon,
  UsersIcon,
} from "lucide-react"

import type { PropertySummary } from "@workspace/content/queries"
import { Badge } from "@workspace/ui/components/badge"
import { cn } from "@workspace/ui/lib/utils"

import { displayFont } from "./display"
import { FeedImage } from "./feed-image"

export type PropertyCardProps = {
  property: PropertySummary
  /** `sizes` for the photo; defaults to the PropertyGrid's columns. */
  sizes?: string
  /** Preload the photo (the first cards above the fold). */
  preload?: boolean
  /** Heading level of the name inside the page outline. @default "h3" */
  headingAs?: "h2" | "h3" | "h4"
  className?: string
}

/** The Property page's URL. */
export const propertyHref = (property: Pick<PropertySummary, "slug">) =>
  `/rentals/${property.slug}`

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`

/**
 * A Property in lists and grids: photo, name, Location, sleeps, bedrooms,
 * bathrooms, Rating and a pet-friendly badge. The whole card links to the
 * Property page; the name is the link text.
 */
export function PropertyCard({
  property,
  sizes = "(min-width: 1280px) 400px, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
  preload = false,
  headingAs: Heading = "h3",
  className,
}: PropertyCardProps) {
  const { name, location, sleeps, bedrooms, bathrooms, rating, reviewCount } =
    property
  const facts = [
    sleeps != null && { icon: UsersIcon, label: `Sleeps ${sleeps}` },
    bedrooms != null && {
      icon: BedDoubleIcon,
      label:
        bedrooms === 0 ? "Studio" : plural(bedrooms, "bedroom", "bedrooms"),
    },
    bathrooms != null && {
      icon: BathIcon,
      label: plural(bathrooms, "bath", "baths"),
    },
  ].filter((fact) => fact !== false)

  return (
    <article className={cn("group relative flex flex-col gap-3", className)}>
      <div className="relative">
        <FeedImage
          image={property.image}
          alt=""
          sizes={sizes}
          preload={preload}
          className="rounded-lg transition-[filter] duration-300 group-hover:brightness-95"
        />
        {property.petsAllowed && (
          <Badge className="absolute top-3 left-3 bg-(--brand-accent) text-(--brand-accent-foreground)">
            <PawPrintIcon data-icon="inline-start" aria-hidden />
            Pet friendly
          </Badge>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-3">
          <Heading
            className={cn(displayFont, "text-xl leading-tight text-balance")}
          >
            <Link
              href={propertyHref(property)}
              className="decoration-(--brand-accent) decoration-2 underline-offset-4 outline-none group-hover:underline after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-3 focus-visible:after:ring-ring/60"
            >
              {name}
            </Link>
          </Heading>
          {rating != null && (
            <p className="flex shrink-0 items-center gap-1 text-sm font-medium">
              <StarIcon
                aria-hidden
                className="size-3.5 fill-(--brand-accent) text-(--brand-accent)"
              />
              <span className="sr-only">Rated </span>
              {rating.toFixed(1)}
              <span className="font-normal text-muted-foreground">
                <span className="sr-only">out of 5 from</span> ({reviewCount}
                <span className="sr-only"> reviews</span>)
              </span>
            </p>
          )}
        </div>
        {location && (
          <p className="text-sm text-muted-foreground">{location.name}</p>
        )}
        {facts.length > 0 && (
          <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {facts.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-1.5">
                <Icon aria-hidden className="size-4 text-muted-foreground" />
                {label}
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  )
}

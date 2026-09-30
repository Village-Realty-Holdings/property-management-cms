import Image from "next/image"
import { Bath, BedDouble, Star, Users } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

import type { Rental } from "../../fixtures/types"
import { safeHref } from "../../RichText"

const count = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`

/** "Rated 4.5 out of 5, 12 reviews", or that there are none yet. */
export function ratingText(rental: Pick<Rental, "rating" | "reviews">) {
  if (rental.reviews <= 0) return "No reviews yet"
  return `Rated ${rental.rating.toFixed(1)} out of 5, ${count(rental.reviews, "review", "reviews")}`
}

/**
 * A Rental as a card: its photo, name (a link out to the Rental's page when
 * its url is one a browser should follow), type and location, bedrooms,
 * baths and how many it sleeps, its rating and reviews, and its features.
 * It is an `<article>` headed by the Rental's name, one level under the
 * Block's own heading. The whole card is the link's target.
 */
export function RentalCard({
  rental,
  className,
}: {
  rental: Rental
  className?: string
}) {
  const href = safeHref(rental.url)
  const reviewed = rental.reviews > 0
  return (
    <article
      className={cn(
        "group/card relative flex h-full flex-col overflow-hidden rounded-(--card-radius) bg-card text-card-foreground shadow-(--card-shadow) ring-1 ring-foreground/10 has-[a:focus-visible]:outline-3 has-[a:focus-visible]:-outline-offset-3 has-[a:focus-visible]:outline-ring",
        className
      )}
    >
      <div className="relative aspect-4/3 w-full bg-muted">
        <Image
          src={rental.photo.src}
          alt={rental.photo.alt}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover"
        />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-col gap-1">
          <h3 className="font-heading text-lg leading-snug font-medium text-balance">
            {href ? (
              <a
                href={href}
                className="outline-none after:absolute after:inset-0 after:content-[''] hover:underline hover:underline-offset-4"
              >
                {rental.name}
              </a>
            ) : (
              rental.name
            )}
          </h3>
          <p className="text-sm text-muted-foreground">
            {rental.type} <span aria-hidden>·</span>
            <span className="sr-only">, </span> {rental.location}
          </p>
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <li className="flex items-center gap-1.5">
            <BedDouble aria-hidden className="size-4" />
            {rental.bedrooms === 0
              ? "Studio"
              : count(rental.bedrooms, "bedroom", "bedrooms")}
          </li>
          <li className="flex items-center gap-1.5">
            <Bath aria-hidden className="size-4" />
            {count(rental.baths, "bath", "baths")}
          </li>
          <li className="flex items-center gap-1.5">
            <Users aria-hidden className="size-4" />
            Sleeps {rental.sleeps}
          </li>
        </ul>
        <p className="flex items-center gap-1.5 text-sm">
          {reviewed ? (
            <>
              <Star aria-hidden className="size-4 fill-accent text-accent" />
              <span aria-hidden>
                {rental.rating.toFixed(1)} ({rental.reviews})
              </span>
              <span className="sr-only">{ratingText(rental)}</span>
            </>
          ) : (
            ratingText(rental)
          )}
        </p>
        {rental.features.length > 0 && (
          <ul className="mt-auto flex flex-wrap gap-1.5 pt-1">
            {rental.features.map((feature) => (
              <li
                key={feature}
                className="rounded-(--card-radius) bg-muted px-2 py-0.5 text-xs text-muted-foreground"
              >
                {feature}
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  )
}

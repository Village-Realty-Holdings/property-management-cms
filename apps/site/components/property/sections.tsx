import type { ReactNode } from "react"
import Link from "next/link"
import {
  BathIcon,
  BedDoubleIcon,
  CheckIcon,
  ClockIcon,
  DoorOpenIcon,
  HouseIcon,
  IdCardIcon,
  LogOutIcon,
  PawPrintIcon,
  ScrollTextIcon,
  StarIcon,
  TicketPercentIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react"

import type {
  Amenity,
  PropertyDetail,
  Review,
  Room,
  SpecialDoc,
  StayPolicy,
} from "@workspace/content"
import { cn } from "@workspace/ui/lib/utils"

import { displayFont } from "@workspace/site-views/site/display"

import { AmenityIcon } from "./amenity-icon"
import {
  bedLabel,
  formatDay,
  formatStayDate,
  formatTime,
  groupAmenities,
  isoDate,
  plural,
} from "./format"

/** A titled section of the Property page, labelled by its heading. */
export function PropertySection({
  id,
  title,
  description,
  children,
  className,
}: {
  id: string
  title: string
  description?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section
      aria-labelledby={`${id}-heading`}
      className={cn(
        "flex scroll-mt-24 flex-col gap-6 border-t border-border pt-10",
        className
      )}
    >
      <div className="flex flex-col gap-1.5">
        <h2
          id={`${id}-heading`}
          className={cn(displayFont, "text-2xl leading-tight sm:text-3xl")}
        >
          {title}
        </h2>
        {description && (
          <p className="text-base text-pretty text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {children}
    </section>
  )
}

/** Sleeps, bedrooms, bathrooms, type and pets, as a row of facts. */
export function KeyFacts({ property }: { property: PropertyDetail }) {
  const { sleeps, bedrooms, bathrooms, propertyType, petsAllowed } = property
  const facts: { icon: LucideIcon; label: string }[] = [
    propertyType && { icon: HouseIcon, label: propertyType.name },
    sleeps != null && { icon: UsersIcon, label: `Sleeps ${sleeps}` },
    bedrooms != null && {
      icon: BedDoubleIcon,
      label:
        bedrooms === 0 ? "Studio" : plural(bedrooms, "bedroom", "bedrooms"),
    },
    bathrooms != null && {
      icon: BathIcon,
      label: plural(bathrooms, "bathroom", "bathrooms"),
    },
    petsAllowed && { icon: PawPrintIcon, label: "Pets welcome" },
  ]
    .filter((fact) => !!fact)
    // A "Studio" Property Type and 0 bedrooms would both say "Studio".
    .filter(
      (fact, i, all) =>
        all.findIndex(
          (other) => other.label.toLowerCase() === fact.label.toLowerCase()
        ) === i
    )
  if (facts.length === 0) return null
  return (
    <ul
      aria-label="Key facts"
      className="flex flex-wrap gap-x-6 gap-y-3 text-base"
    >
      {facts.map(({ icon: Icon, label }) => (
        <li key={label} className="flex items-center gap-2">
          <Icon aria-hidden className="size-5 text-(--brand-primary)" />
          {label}
        </li>
      ))}
    </ul>
  )
}

export function Highlights({ highlights }: { highlights: string[] }) {
  return (
    <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
      {highlights.map((highlight, i) => (
        <li key={`${highlight}-${i}`} className="flex items-start gap-3">
          <span
            aria-hidden
            className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-(--brand-accent) text-(--brand-accent-foreground)"
          >
            <CheckIcon className="size-3.5" strokeWidth={3} />
          </span>
          <span className="text-pretty">{highlight}</span>
        </li>
      ))}
    </ul>
  )
}

export function Rooms({ rooms }: { rooms: Room[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {rooms.map((room, i) => (
        <li
          key={`${room.name ?? "room"}-${i}`}
          className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4"
        >
          <BedDoubleIcon
            aria-hidden
            className="size-6 text-(--brand-primary)"
            strokeWidth={1.5}
          />
          <h3 className="font-semibold">{room.name ?? `Room ${i + 1}`}</h3>
          {room.beds.length > 0 && (
            <p className="text-sm">{room.beds.map(bedLabel).join(", ")}</p>
          )}
          {room.sleeps != null && (
            <p className="text-sm text-muted-foreground">
              Sleeps {room.sleeps}
            </p>
          )}
        </li>
      ))}
    </ul>
  )
}

export function Amenities({ amenities }: { amenities: Amenity[] }) {
  const groups = groupAmenities(amenities)
  return (
    <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
      {groups.map((group) => (
        <div key={group.name} className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-muted-foreground">
            {group.name}
          </h3>
          <ul className="flex flex-col gap-2.5">
            {group.amenities.map((amenity) => (
              <li key={amenity.id} className="flex items-center gap-3">
                <AmenityIcon
                  icon={amenity.icon}
                  className="text-(--brand-primary)"
                />
                {amenity.name}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

/** Whether the Stay Policy has anything to show. */
export const hasStayPolicy = (policy: StayPolicy) =>
  Object.values(policy).some((value) => value !== null && value !== "")

export function StayPolicyList({ policy }: { policy: StayPolicy }) {
  const times = [
    policy.checkIn && {
      icon: DoorOpenIcon,
      term: "Check-in",
      value: `From ${formatTime(policy.checkIn)}`,
    },
    policy.checkOut && {
      icon: LogOutIcon,
      term: "Check-out",
      value: `By ${formatTime(policy.checkOut)}`,
    },
    policy.minimumAge != null && {
      icon: IdCardIcon,
      term: "Minimum age",
      value: `The main guest must be ${policy.minimumAge} or older`,
    },
  ].filter((item) => !!item)
  const texts = [
    policy.houseRules && {
      icon: ScrollTextIcon,
      term: "House rules",
      value: policy.houseRules,
    },
    policy.cancellationPolicy && {
      icon: ClockIcon,
      term: "Cancellation",
      value: policy.cancellationPolicy,
    },
  ].filter((item) => !!item)

  return (
    <dl className="flex flex-col gap-6">
      {times.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          {times.map(({ icon: Icon, term, value }) => (
            <div
              key={term}
              className="flex flex-col gap-1 rounded-lg bg-muted px-4 py-3"
            >
              <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                <Icon aria-hidden className="size-4" />
                {term}
              </dt>
              <dd className="font-semibold text-pretty">{value}</dd>
            </div>
          ))}
        </div>
      )}
      {texts.map(({ icon: Icon, term, value }) => (
        <div key={term} className="flex flex-col gap-2">
          <dt className="flex items-center gap-2 font-semibold">
            <Icon aria-hidden className="size-4 text-(--brand-primary)" />
            {term}
          </dt>
          <dd className="max-w-prose leading-relaxed text-pretty whitespace-pre-line">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/** Five stars filled to the rating (rounded to the nearest whole star). */
export function Stars({
  rating,
  className,
}: {
  rating: number
  className?: string
}) {
  const filled = Math.round(rating)
  return (
    <span
      role="img"
      aria-label={`Rated ${rating.toFixed(1)} out of 5`}
      className={cn("inline-flex gap-0.5", className)}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon
          key={n}
          aria-hidden
          className={cn(
            "size-4",
            n <= filled
              ? "fill-(--brand-accent) text-(--brand-accent)"
              : "text-border"
          )}
        />
      ))}
    </span>
  )
}

/** How many Reviews show before "Show all reviews". */
const REVIEWS_SHOWN = 4

export function Reviews({
  reviews,
  rating,
  reviewCount,
  siteName,
}: {
  reviews: Review[]
  rating: number | null
  reviewCount: number
  siteName: string
}) {
  const first = reviews.slice(0, REVIEWS_SHOWN)
  const more = reviews.slice(REVIEWS_SHOWN)
  return (
    <div className="flex flex-col gap-8">
      {rating != null && (
        <div className="flex items-center gap-4">
          <p
            className={cn(
              displayFont,
              "text-5xl leading-none text-(--brand-primary)"
            )}
          >
            {rating.toFixed(1)}
          </p>
          <div className="flex flex-col gap-1">
            <Stars rating={rating} />
            <p className="text-sm text-muted-foreground">
              {plural(reviewCount, "review", "reviews")}
            </p>
          </div>
        </div>
      )}
      {reviews.length > 0 && (
        <>
          <ReviewList reviews={first} siteName={siteName} />
          {more.length > 0 && (
            <details className="group">
              <summary className="w-fit cursor-pointer rounded-md font-medium text-primary underline decoration-(--brand-accent) decoration-2 underline-offset-4 group-open:mb-8 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
                <span className="group-open:hidden">
                  Show {plural(more.length, "more review", "more reviews")}
                </span>
                <span className="hidden group-open:inline">
                  Hide {plural(more.length, "review", "reviews")}
                </span>
              </summary>
              <ReviewList reviews={more} siteName={siteName} />
            </details>
          )}
        </>
      )}
    </div>
  )
}

function ReviewList({
  reviews,
  siteName,
}: {
  reviews: Review[]
  siteName: string
}) {
  return (
    <ul className="grid gap-x-10 gap-y-10 md:grid-cols-2">
      {reviews.map((review) => {
        const stayed = formatStayDate(review.stayDate)
        return (
          <li key={review.id}>
            <article className="flex flex-col gap-3">
              {review.rating != null && <Stars rating={review.rating} />}
              {review.title && (
                <h3 className="text-lg leading-snug font-semibold text-balance">
                  {review.title}
                </h3>
              )}
              {review.body && (
                <p className="leading-relaxed text-pretty whitespace-pre-line">
                  {review.body}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                {review.guestName ?? "A guest"}
                {stayed && (
                  <>
                    , stayed{" "}
                    <time dateTime={isoDate(review.stayDate)}>{stayed}</time>
                  </>
                )}
              </p>
              {review.managerResponse && (
                <div className="mt-1 flex flex-col gap-1 border-l-2 border-(--brand-accent) pl-4">
                  <p className="text-sm font-semibold">
                    Response from {siteName}
                  </p>
                  <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
                    {review.managerResponse}
                  </p>
                </div>
              )}
            </article>
          </li>
        )
      })}
    </ul>
  )
}

export function Specials({ specials }: { specials: SpecialDoc[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {specials.map((special) => {
        const ends = formatDay(special.validTo)
        return (
          <li key={special.id}>
            <Link
              href={`/specials/${special.slug}`}
              className="group flex h-full gap-4 rounded-lg border border-border bg-card p-4 transition-colors hover:border-(--brand-accent) focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <TicketPercentIcon
                aria-hidden
                className="size-6 shrink-0 text-(--brand-accent)"
              />
              <span className="flex flex-col gap-1">
                <span className="font-semibold decoration-(--brand-accent) decoration-2 underline-offset-4 group-hover:underline">
                  {special.title}
                </span>
                {special.description && (
                  <span className="text-sm text-pretty text-muted-foreground">
                    {special.description}
                  </span>
                )}
                {ends && (
                  <span className="text-sm">
                    Ends <time dateTime={isoDate(special.validTo)}>{ends}</time>
                  </span>
                )}
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

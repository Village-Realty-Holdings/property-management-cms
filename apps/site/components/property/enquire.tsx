import Link from "next/link"
import { MailIcon, PhoneIcon } from "lucide-react"

import type { PropertyDetail } from "@workspace/content"
import { cn } from "@workspace/ui/lib/utils"

import { displayFont } from "@workspace/site-views/site/display"
import { telHref } from "@workspace/site-views/theme/branding"

import { formatTime } from "./format"

/** Where the Enquire form lives, pre-filled with this Property. */
export const enquireHref = (property: Pick<PropertyDetail, "slug">) =>
  `/contact?property=${encodeURIComponent(property.slug)}`

const ctaClass =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full bg-(--brand-accent) px-6 text-base font-semibold text-(--brand-accent-foreground) transition-[filter] hover:brightness-95 focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:outline-none"

const bookingNote = (property: PropertyDetail) =>
  property.onlineBookable
    ? "Tell us your dates and group size and we'll confirm availability and the price."
    : "Contact us to book: our team takes reservations for this home directly."

/**
 * The desktop side panel: how to book, the check-in and check-out times,
 * and the Enquire button. Sticky beside the page's content.
 */
export function EnquireCard({
  property,
  phone,
}: {
  property: PropertyDetail
  phone: string | null
}) {
  const { checkIn, checkOut } = property.stayPolicy
  return (
    <div className="flex flex-col gap-5 rounded-xl border border-border bg-card p-6 shadow-[0_1px_0_var(--border),0_12px_32px_-20px_color-mix(in_oklab,var(--brand-primary)_45%,transparent)]">
      <div className="flex flex-col gap-2">
        <p className={cn(displayFont, "text-2xl leading-tight")}>
          {property.onlineBookable ? "Plan your stay" : "Contact us to book"}
        </p>
        <p className="text-sm text-pretty text-muted-foreground">
          {bookingNote(property)}
        </p>
      </div>
      {(checkIn || checkOut) && (
        <dl className="grid grid-cols-2 overflow-hidden rounded-lg border border-border text-sm">
          {checkIn && (
            <div className="flex flex-col gap-0.5 px-3 py-2.5">
              <dt className="text-muted-foreground">Check-in</dt>
              <dd className="font-semibold">{formatTime(checkIn)}</dd>
            </div>
          )}
          {checkOut && (
            <div
              className={cn(
                "flex flex-col gap-0.5 px-3 py-2.5",
                checkIn && "border-l border-border"
              )}
            >
              <dt className="text-muted-foreground">Check-out</dt>
              <dd className="font-semibold">{formatTime(checkOut)}</dd>
            </div>
          )}
        </dl>
      )}
      <Link href={enquireHref(property)} className={ctaClass}>
        <MailIcon aria-hidden className="size-4" />
        Enquire about this home
      </Link>
      {phone && (
        <p className="text-center text-sm text-muted-foreground">
          Or call{" "}
          <a
            href={telHref(phone)}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            {phone}
          </a>
        </p>
      )}
    </div>
  )
}

/**
 * The phone and tablet counterpart: a bar that sticks to the bottom of the
 * viewport while the Property's content scrolls, then settles at its end
 * (so it never covers the footer).
 */
export function EnquireBar({
  property,
  phone,
}: {
  property: PropertyDetail
  phone: string | null
}) {
  return (
    <div className="sticky bottom-0 z-20 -mx-4 mt-12 border-t border-border bg-background/95 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-background/85 sm:-mx-6 sm:px-6 lg:hidden">
      <div className="flex items-center gap-3">
        <p className="min-w-0 flex-1 text-sm leading-snug">
          <span className="block truncate font-semibold">{property.name}</span>
          <span className="block text-muted-foreground">
            {property.onlineBookable
              ? "Ask about dates and prices"
              : "Contact us to book"}
          </span>
        </p>
        {phone && (
          <a
            href={telHref(phone)}
            aria-label={`Call ${phone}`}
            className="inline-flex size-12 shrink-0 items-center justify-center rounded-full border border-border focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none"
          >
            <PhoneIcon aria-hidden className="size-5" />
          </a>
        )}
        <Link href={enquireHref(property)} className={cn(ctaClass, "px-5")}>
          Enquire
        </Link>
      </div>
    </div>
  )
}

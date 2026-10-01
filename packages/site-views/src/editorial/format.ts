/**
 * Pure helpers for the Guides and Specials pages: human dates, a Special's
 * validity window, expiry, page numbers from the query string and JSON-LD.
 * No React or Next imports, so they run under `node --test`.
 */

// Special dates are days stored as UTC midnights ("2026-12-31T00:00:00.000Z");
// format in UTC so a US visitor never sees the day before. A Guide's
// `publishedAt` can be an exact time, which then shows its UTC day: Site
// Settings carry no time zone to format it in.
const dateFormat = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
})

const toDate = (iso: string | null | undefined): Date | null => {
  if (!iso) return null
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? null : date
}

/** "June 1, 2026"; null for a missing or unparseable date. */
export function formatDate(iso: string | null | undefined): string | null {
  const date = toDate(iso)
  return date ? dateFormat.format(date) : null
}

/**
 * A Special's validity window in words: "January 1 – December 31, 2026",
 * "Until December 31, 2026", "From January 1, 2026", or null when open-ended.
 */
export function formatValidity(
  validFrom: string | null | undefined,
  validTo: string | null | undefined
): string | null {
  const from = toDate(validFrom)
  const to = toDate(validTo)
  if (from && to) {
    return to < from
      ? `Until ${dateFormat.format(to)}`
      : dateFormat.formatRange(from, to)
  }
  if (to) return `Until ${dateFormat.format(to)}`
  if (from) return `From ${dateFormat.format(from)}`
  return null
}

const DAY = 24 * 60 * 60 * 1000

/**
 * Whether a Special's last day has passed (an unparseable date counts as
 * open). `validTo` is a day stored as UTC midnight, and guests read it as
 * "until the end of that day", so this only hides it a day later. It's a
 * backstop for cached lists: the CMS query decides first.
 */
export function isExpired(
  special: { validTo: string | null | undefined },
  now: number
): boolean {
  const to = toDate(special.validTo)
  return to !== null && to.getTime() + DAY < now
}

/** A positive page number from `?page=`; anything else is page 1. */
export function pageParam(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value
  if (!raw || !/^\d+$/.test(raw)) return 1
  const page = Number(raw)
  return Number.isSafeInteger(page) && page >= 1 ? page : 1
}

/**
 * JSON for a `<script type="application/ld+json">`, with `<` escaped so CMS
 * text can never close the script element.
 */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c")
}

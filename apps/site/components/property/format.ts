import type { Address, Amenity, PropertyDetail, Room } from "@workspace/content"

/**
 * Pure formatting for the Property page: plurals, times, dates, beds, the
 * map link and Amenity groups. No React, so it's easy to reason about.
 */

export const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`

/** "15:00" → "3:00 PM"; anything else (e.g. "After 4pm") is shown as-is. */
export function formatTime(value: string): string {
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(value.trim())
  if (!match) return value
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return value
  const suffix = hours < 12 ? "AM" : "PM"
  const h = hours % 12 === 0 ? 12 : hours % 12
  return `${h}:${String(minutes).padStart(2, "0")} ${suffix}`
}

const monthYear = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
})

const dayMonthYear = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
})

function parseDate(value: string | null): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/** A Review's stay date as "March 2026"; null when missing or invalid. */
export function formatStayDate(value: string | null): string | null {
  const date = parseDate(value)
  return date ? monthYear.format(date) : null
}

/** A Special's end date as "Mar 31, 2026"; null when missing or invalid. */
export function formatDay(value: string | null): string | null {
  const date = parseDate(value)
  return date ? dayMonthYear.format(date) : null
}

/** The date in ISO form for `<time dateTime>`. */
export function isoDate(value: string | null): string | undefined {
  return parseDate(value)?.toISOString().slice(0, 10)
}

const bedNames: Record<string, [string, string]> = {
  king: ["king bed", "king beds"],
  queen: ["queen bed", "queen beds"],
  full: ["full bed", "full beds"],
  double: ["double bed", "double beds"],
  twin: ["twin bed", "twin beds"],
  single: ["single bed", "single beds"],
  bunk: ["bunk bed", "bunk beds"],
  "sofa-sleeper": ["sofa sleeper", "sofa sleepers"],
  sofa: ["sofa bed", "sofa beds"],
  crib: ["crib", "cribs"],
}

/** { type: "queen", count: 2 } → "2 queen beds"; unknown types are humanised. */
export function bedLabel(bed: Room["beds"][number]): string {
  const known = bedNames[bed.type]
  if (known) return plural(bed.count, known[0], known[1])
  const name = bed.type.replace(/[-_]+/g, " ").trim().toLowerCase()
  const one = /\bbed$|sleeper$|crib$/.test(name) ? name : `${name} bed`
  return plural(bed.count, one, `${one}s`)
}

/** "123 Main St, Park City, UT 84060, US" from the parts that are set. */
export function addressLine(address: Address | null): string | null {
  if (!address) return null
  const regionPostal = [address.region, address.postalCode]
    .filter(Boolean)
    .join(" ")
  const parts = [address.line1, address.city, regionPostal, address.country]
    .map((part) => part?.trim())
    .filter(Boolean)
  return parts.length > 0 ? parts.join(", ") : null
}

/**
 * A Google Maps search link (no API key) for the Property's coordinates,
 * else its address; null when it has neither.
 */
export function mapsUrl(
  property: Pick<PropertyDetail, "geo" | "address">
): string | null {
  const query = property.geo
    ? `${property.geo.lat},${property.geo.lng}`
    : addressLine(property.address)
  if (!query) return null
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

export type AmenityGroup = { name: string; amenities: Amenity[] }

/**
 * Amenities grouped by the Site's group label, keeping the Site's order:
 * groups appear in the order of their first Amenity. Ungrouped ones go last
 * under "Other" (or "Amenities" when nothing is grouped).
 */
export function groupAmenities(amenities: Amenity[]): AmenityGroup[] {
  const groups = new Map<string, Amenity[]>()
  const ungrouped: Amenity[] = []
  for (const amenity of amenities) {
    const group = amenity.group?.trim()
    if (!group) {
      ungrouped.push(amenity)
      continue
    }
    const list = groups.get(group)
    if (list) list.push(amenity)
    else groups.set(group, [amenity])
  }
  const result = [...groups].map(([name, list]) => ({ name, amenities: list }))
  if (ungrouped.length > 0) {
    result.push({
      name: result.length > 0 ? "Other" : "Amenities",
      amenities: ungrouped,
    })
  }
  return result
}

/** Only http(s) URLs are linked (a virtual tour, say). */
export function externalUrl(value: string | null): string | null {
  if (!value) return null
  try {
    const url = new URL(value.trim())
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null
  } catch {
    return null
  }
}

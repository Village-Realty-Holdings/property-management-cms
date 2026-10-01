/**
 * A moment as the Staff User reads it: in the time zone of the browser that
 * shows it. Admin times used to be UTC, so at 6:30 PM on 30 Sep a Staff User
 * in Chicago saw "Oct 1". The time zone is a parameter so tests can pin it;
 * the default is the machine's own, which in a browser is the viewer's.
 */

export type MomentOptions = {
  /** An IANA zone ("America/Chicago"); the machine's own when absent. */
  timeZone?: string
  /** Names the zone after the time ("6:30 PM CDT"; "UTC" for UTC). */
  withZone?: boolean
}

// Formatters with a zone given are kept; one without follows the machine's
// zone, which can change (a test, a laptop crossing zones), so it is rebuilt.
const formats = new Map<string, Intl.DateTimeFormat>()

function formatter(
  timeZone: string | undefined,
  zoneName: "short" | "long" | undefined
): Intl.DateTimeFormat {
  const key = `${timeZone ?? ""}|${zoneName ?? ""}`
  const kept = formats.get(key)
  if (kept) return kept
  const made = new Intl.DateTimeFormat("en", {
    // The parts of dateStyle "medium" + timeStyle "short"; those styles
    // cannot be combined with timeZoneName.
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    ...(timeZone ? { timeZone } : {}),
    ...(zoneName ? { timeZoneName: zoneName } : {}),
  })
  if (timeZone) formats.set(key, made)
  return made
}

function format(
  iso: string,
  zoneName: "short" | "long" | undefined,
  timeZone: string | undefined
): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  // Intl puts a narrow no-break space before AM/PM; plain text reads and
  // matches better.
  return formatter(timeZone, zoneName).format(date).replaceAll("\u202f", " ")
}

/** "Sep 30, 2026, 6:30 PM" (or "... 6:30 PM CDT" with `withZone`). */
export function formatMoment(
  iso: string,
  { timeZone, withZone = false }: MomentOptions = {}
): string {
  return format(iso, withZone ? "short" : undefined, timeZone)
}

/** The same moment with the zone spelled out, for a `title`. */
export function momentTitle(
  iso: string,
  { timeZone }: Pick<MomentOptions, "timeZone"> = {}
): string {
  return format(iso, "long", timeZone)
}

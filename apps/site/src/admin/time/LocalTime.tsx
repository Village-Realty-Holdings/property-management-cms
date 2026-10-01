"use client"

import { useSyncExternalStore } from "react"

import { formatMoment, momentTitle } from "./formatMoment"

/**
 * Admin times are shown in the viewer's time zone, which only the browser
 * knows. The server renders the moment in UTC, named as UTC so it never
 * passes for local time; the browser then swaps in its own zone. Reading the
 * zone through `useSyncExternalStore` (the server snapshot is the UTC text)
 * keeps hydration clean: React hydrates with the server snapshot, then
 * re-renders at once with the browser's.
 */

const never = () => () => {}

type Options = { withZone?: boolean }

/** The moment as text for the viewer, `""` while `iso` is not given. */
export function useLocalMoment(
  iso: string | null | undefined,
  { withZone = false }: Options = {}
): string {
  return useSyncExternalStore(
    never,
    () => (iso ? formatMoment(iso, { withZone }) : ""),
    () => (iso ? formatMoment(iso, { timeZone: "UTC", withZone: true }) : "")
  )
}

/** The zone spelled out ("Central Daylight Time"), for a `title`. */
function useLocalTitle(iso: string): string {
  return useSyncExternalStore(
    never,
    () => momentTitle(iso),
    () => momentTitle(iso, { timeZone: "UTC" })
  )
}

/**
 * A moment in the viewer's time zone as a `<time>`; hovering it names the
 * zone. `withZone` also prints the zone after the time ("6:30 PM CDT"), for
 * places where the exact moment matters, like a version history.
 */
export function LocalTime({
  iso,
  withZone = false,
}: { iso: string } & Options) {
  const text = useLocalMoment(iso, { withZone })
  const title = useLocalTitle(iso)
  return (
    <time dateTime={iso} title={title}>
      {text}
    </time>
  )
}

/**
 * What a Rental Block says when it has no Rentals to show: the Site has no
 * fixtures, or (with `minSleeps`) none is that large, or (`filtered`) none
 * passes the visitor's filters. Plain text in the Block's own colour, so it
 * reads on any background.
 */
export function RentalsEmpty({
  minSleeps,
  filtered,
}: {
  /** Set when the Site has Rentals but none sleeps this many. */
  minSleeps?: number | null
  /** Set when the Site has Rentals but the chosen filters keep none. */
  filtered?: boolean
}) {
  return (
    <p className="rounded-(--card-radius) border border-dashed border-current/40 p-6 text-center text-pretty">
      {filtered
        ? "No rentals match these filters. Try removing one."
        : typeof minSleeps === "number"
          ? `No rentals sleep ${minSleeps} or more guests yet. Check back soon.`
          : "No rentals to show yet. Check back soon."}
    </p>
  )
}

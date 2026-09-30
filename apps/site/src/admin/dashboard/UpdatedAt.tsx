const format = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
})

/** A moment as text, in UTC so the server and the browser agree. */
export function UpdatedAt({ iso }: { iso: string }) {
  return (
    <time dateTime={iso} title="UTC">
      {format.format(new Date(iso))}
    </time>
  )
}

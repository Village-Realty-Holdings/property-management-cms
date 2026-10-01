import { LocalTime } from "../time/LocalTime"

/** When something was last saved, in the viewer's time zone. */
export function UpdatedAt({ iso }: { iso: string }) {
  return <LocalTime iso={iso} />
}

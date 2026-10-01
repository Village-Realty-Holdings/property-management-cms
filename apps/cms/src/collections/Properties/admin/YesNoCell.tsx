"use client"

import type { DefaultCellComponentProps } from "payload"

/**
 * List cell for a checkbox: "Yes" / "No" instead of Payload's raw
 * `true` / `false`. Shared by the feed records (Properties, Locations,
 * Specials) via its import-map path.
 */
export function YesNoCell({ cellData }: DefaultCellComponentProps) {
  return <span>{cellData ? "Yes" : "No"}</span>
}
